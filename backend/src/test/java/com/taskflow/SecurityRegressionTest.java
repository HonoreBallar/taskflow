package com.taskflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.taskflow.security.AuthCookies;
import com.taskflow.security.LoginAttemptService;
import jakarta.servlet.http.Cookie;
import org.springframework.mock.web.MockHttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Non-régression des corrections de l'audit de sécurité. */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityRegressionTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    private static String json(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private String login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json(email, password)))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie(AuthCookies.NAME).getValue();
    }

    /** Inscrit un nouvel utilisateur (sans workspace) ; retourne {token, user} (token = valeur du cookie de session). */
    private JsonNode register(String password) throws Exception {
        String email = "u" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
        MockHttpServletResponse response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstname\":\"Zed\",\"lastname\":\"Test\",\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse();
        ObjectNode node = (ObjectNode) mapper.readTree(response.getContentAsString());
        node.put("token", response.getCookie(AuthCookies.NAME).getValue());
        return node;
    }

    private static Cookie session(String token) {
        return new Cookie(AuthCookies.NAME, token);
    }

    @Test
    void sessionCookieIsHttpOnlyStrictAndNeverInTheBody() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json("manager@taskflow.com", "Manager123!")))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(AuthCookies.NAME, true))
                .andExpect(cookie().sameSite(AuthCookies.NAME, "Strict"))
                .andExpect(cookie().path(AuthCookies.NAME, "/"))
                .andExpect(jsonPath("$.token").doesNotExist());

        mvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent()).andExpect(cookie().maxAge(AuthCookies.NAME, 0));
    }

    @Test
    void cookieSessionIsProtectedAgainstCsrf() throws Exception {
        JsonNode auth = register("Password1");
        Cookie cookie = session(auth.get("token").asText());
        String profile = "{\"firstname\":\"Zed\",\"lastname\":\"Csrf\",\"email\":\"" + auth.get("user").get("email").asText() + "\"}";

        mvc.perform(get("/api/users/me").cookie(cookie)).andExpect(status().isOk());

        // Le navigateur de la victime, piloté par un autre site : origine refusée par le filtre CORS
        mvc.perform(put("/api/users/me").cookie(cookie).header("Origin", "https://evil.example")
                        .contentType(MediaType.APPLICATION_JSON).content(profile))
                .andExpect(status().isForbidden());
        // Requête de modification qui n'annonce aucune origine : refusée
        mvc.perform(put("/api/users/me").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(profile))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/me").cookie(cookie)).andExpect(jsonPath("$.lastname").value("Test"));

        // L'application elle-même (origine autorisée)
        mvc.perform(put("/api/users/me").cookie(cookie).header("Origin", "http://localhost:4200")
                        .contentType(MediaType.APPLICATION_JSON).content(profile))
                .andExpect(status().isOk()).andExpect(jsonPath("$.lastname").value("Csrf"));
    }

    @Test
    void avatarsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/users/1/avatar")).andExpect(status().isUnauthorized());
    }

    @Test
    void emailChangeRequiresCurrentPassword() throws Exception {
        JsonNode auth = register("Password1");
        String token = auth.get("token").asText();
        String body = "{\"firstname\":\"Zed\",\"lastname\":\"Test\",\"email\":\"x" + UUID.randomUUID().toString().substring(0, 8) + "@test.com\"";

        mvc.perform(put("/api/users/me").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content(body + "}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/users/me").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content(body + ",\"currentPassword\":\"wrong-one\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/users/me").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.email").value(auth.get("user").get("email").asText()));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void tokenInUrlIsNotAccepted() throws Exception {
        String token = login("manager@taskflow.com", "Manager123!");
        mvc.perform(get("/api/files/1").param("access_token", token)).andExpect(status().isUnauthorized());
    }

    @Test
    void passwordChangeInvalidatesExistingTokens() throws Exception {
        JsonNode auth = register("Password1");
        String token = auth.get("token").asText();
        String email = auth.get("user").get("email").asText();
        mvc.perform(get("/api/users/me").header("Authorization", bearer(token))).andExpect(status().isOk());

        mvc.perform(put("/api/users/me/password").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"Password1\",\"newPassword\":\"Password2\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/users/me").header("Authorization", bearer(token))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users/me").header("Authorization", bearer(login(email, "Password2")))).andExpect(status().isOk());
    }

    @Test
    void emailChangeRevokesExistingTokens() throws Exception {
        JsonNode auth = register("Password1");
        String token = auth.get("token").asText();
        String newEmail = "n" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";

        mvc.perform(put("/api/users/me").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstname\":\"Zed\",\"lastname\":\"Test\",\"email\":\"" + newEmail + "\",\"currentPassword\":\"Password1\"}"))
                .andExpect(status().isOk());
        // L'ancien token est révoqué : il ne peut pas servir à usurper qui reprendrait l'ancien email
        mvc.perform(get("/api/users/me").header("Authorization", bearer(token))).andExpect(status().isUnauthorized());
    }

    @Test
    void userDirectoryIsLimitedToSharedWorkspaces() throws Exception {
        String outsider = register("Password1").get("token").asText();
        mvc.perform(get("/api/users").param("q", "taskflow").header("Authorization", bearer(outsider)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/search").param("q", "taskflow").header("Authorization", bearer(outsider)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.users", hasSize(0)));

        String member = login("honore@taskflow.com", "User1234!");
        mvc.perform(get("/api/users").param("q", "manager@").header("Authorization", bearer(member)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void outsiderCannotReadProjectData() throws Exception {
        String outsider = register("Password1").get("token").asText();
        String manager = login("manager@taskflow.com", "Manager123!");
        String projects = mvc.perform(get("/api/projects").header("Authorization", bearer(manager)))
                .andReturn().getResponse().getContentAsString();
        long projectId = mapper.readTree(projects).get(0).get("id").asLong();

        mvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(outsider))).andExpect(status().isForbidden());
        mvc.perform(get("/api/projects/" + projectId + "/tasks").header("Authorization", bearer(outsider))).andExpect(status().isForbidden());
        mvc.perform(get("/api/projects/" + projectId + "/attachments").header("Authorization", bearer(outsider))).andExpect(status().isForbidden());
    }

    @Test
    void uploadContentMustMatchExtension() throws Exception {
        String manager = login("manager@taskflow.com", "Manager123!");
        String projects = mvc.perform(get("/api/projects").header("Authorization", bearer(manager)))
                .andReturn().getResponse().getContentAsString();
        long projectId = mapper.readTree(projects).get(0).get("id").asLong();
        String url = "/api/projects/" + projectId + "/attachments";

        MockMultipartFile fake = new MockMultipartFile("file", "rapport.pdf", "application/pdf",
                "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart(url).file(fake).header("Authorization", bearer(manager))).andExpect(status().isBadRequest());

        MockMultipartFile script = new MockMultipartFile("file", "page.html", "text/html", "<html></html>".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart(url).file(script).header("Authorization", bearer(manager))).andExpect(status().isBadRequest());

        MockMultipartFile real = new MockMultipartFile("file", "..\\..\\rapport.pdf", "application/pdf",
                "%PDF-1.7\n%test".getBytes(StandardCharsets.US_ASCII));
        String created = mvc.perform(multipart(url).file(real).header("Authorization", bearer(manager)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("rapport.pdf"))
                .andReturn().getResponse().getContentAsString();
        long fileId = mapper.readTree(created).get("id").asLong();

        mvc.perform(get("/api/files/" + fileId).header("Authorization", bearer(manager))).andExpect(status().isOk());
        mvc.perform(delete("/api/files/" + fileId).header("Authorization", bearer(manager))).andExpect(status().isNoContent());
        mvc.perform(get("/api/files/" + fileId).header("Authorization", bearer(manager))).andExpect(status().isNotFound());
    }

    @Test
    void repeatedLoginFailuresAreThrottled() throws Exception {
        String email = register("Password1").get("user").get("email").asText();
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json(email, "wrong-password")))
                    .andExpect(status().isUnauthorized());
        }
        // Même avec le bon mot de passe, la connexion est refusée jusqu'à la fin de la fenêtre
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json(email, "Password1")))
                .andExpect(status().isTooManyRequests());
    }
}
