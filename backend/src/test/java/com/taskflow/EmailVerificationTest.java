package com.taskflow;

import com.taskflow.mail.MailService;
import com.taskflow.security.AuthCookies;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Avec la configuration de production : une adresse email doit être prouvée avant de servir d'identifiant. */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "taskflow.email-verification=true",
        "spring.datasource.url=jdbc:h2:mem:taskflow-verif;DB_CLOSE_DELAY=-1;MODE=PostgreSQL"
})
class EmailVerificationTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    MailService mail;

    private static String email() {
        return "v" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
    }

    private static String credentials(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private void register(String email, String password) throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstname\":\"Vera\",\"lastname\":\"Test\",\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationRequired").value(true))
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(cookie().doesNotExist(AuthCookies.NAME));
    }

    /** Jeton contenu dans le dernier lien « envoyé » à cette adresse. */
    private String lastTokenSentTo(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).sendLink(eq(email), any(), any(), link.capture());
        String url = link.getValue();
        return url.substring(url.indexOf("token=") + 6);
    }

    private void verifyEmail(String token, int expectedStatus) throws Exception {
        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void accountIsUnusableUntilTheEmailIsConfirmed() throws Exception {
        String email = email();
        register(email, "Password1");
        String token = lastTokenSentTo(email);

        // Bon mot de passe mais adresse non confirmée : pas de session, et le lien est renvoyé
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(email, "Password1")))
                .andExpect(status().isForbidden()).andExpect(cookie().doesNotExist(AuthCookies.NAME));
        String resent = lastTokenSentTo(email);
        verifyEmail(token, 400);          // l'ancien lien est invalidé par le nouveau
        verifyEmail("jeton-invente", 400);

        verifyEmail(resent, 200);
        verifyEmail(resent, 400);         // usage unique
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(email, "Password1")))
                .andExpect(status().isOk()).andExpect(cookie().exists(AuthCookies.NAME));
    }

    @Test
    void registrationDoesNotRevealExistingAccounts() throws Exception {
        String email = email();
        register(email, "Password1");
        clearInvocations(mail);
        // Même réponse pour une adresse déjà inscrite, et le compte existant n'est pas modifié
        register(email, "AutreMotDePasse1");
        verify(mail, never()).sendLink(any(), any(), any(), any());
        register("admin@taskflow.com", "Password1");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials("admin@taskflow.com", "Password1")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordResetProvesOwnershipAndActivatesTheAccount() throws Exception {
        // Un tiers crée un compte au nom de la victime sans pouvoir le confirmer…
        String email = email();
        register(email, "MotDePasseDuTiers1");
        // …la vraie propriétaire de l'adresse récupère le compte par « mot de passe oublié »
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + lastTokenSentTo(email) + "\",\"password\":\"MonVraiMotDePasse1\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(email, "MotDePasseDuTiers1")))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(email, "MonVraiMotDePasse1")))
                .andExpect(status().isOk());
    }

    @Test
    void emailChangeAppliesOnlyAfterTheNewAddressIsConfirmed() throws Exception {
        String oldEmail = email();
        String newEmail = email();
        register(oldEmail, "Password1");
        verifyEmail(lastTokenSentTo(oldEmail), 200);
        String token = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(oldEmail, "Password1")))
                .andReturn().getResponse().getCookie(AuthCookies.NAME).getValue();

        String body = mvc.perform(put("/api/users/me").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstname\":\"Vera\",\"lastname\":\"Test\",\"email\":\"" + newEmail + "\",\"currentPassword\":\"Password1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(oldEmail))   // rien ne change avant confirmation
                .andReturn().getResponse().getContentAsString();
        assertEquals(true, body.contains(oldEmail));
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());

        // Le lien part vers la nouvelle adresse ; une fois ouvert, l'adresse change et les sessions sont fermées
        verifyEmail(lastTokenSentTo(newEmail), 200);
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(oldEmail, "Password1")))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(newEmail, "Password1")))
                .andExpect(status().isOk());
    }
}
