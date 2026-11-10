package com.taskflow;

import com.taskflow.security.AuthCookies;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    private String login(String email, String password) throws Exception {
        // Le JWT est posé dans le cookie de session ; les tests le rejouent en Bearer comme un client d'API
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andReturn().getResponse().getCookie(AuthCookies.NAME).getValue();
    }

    @Test
    void protectedEndpointRequiresToken() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
    }

    @Test
    void registerValidatesInput() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstname\":\"A\",\"lastname\":\"B\",\"email\":\"bad\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void registerThenDuplicateEmailIsRejected() throws Exception {
        String json = "{\"firstname\":\"Jean\",\"lastname\":\"Dupont\",\"email\":\"jean@test.com\",\"password\":\"Password1\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andExpect(cookie().httpOnly(AuthCookies.NAME, true))
                .andExpect(jsonPath("$.verificationRequired").value(false))
                .andExpect(jsonPath("$.user.role").value("USER"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isConflict());
    }

    @Test
    void wrongPasswordIsUnauthorized() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@taskflow.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void managerCanCreateProjectAndTaskAndMoveIt() throws Exception {
        String token = login("manager@taskflow.com", "Manager123!");

        String ws = mvc.perform(get("/api/workspaces").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long workspaceId = mapper.readTree(ws).get(0).get("id").asLong();

        String project = mvc.perform(post("/api/projects").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Projet test\",\"workspaceId\":" + workspaceId + "}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long projectId = mapper.readTree(project).get("id").asLong();

        String task = mvc.perform(post("/api/projects/" + projectId + "/tasks").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Tâche test\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("TODO"))
                .andReturn().getResponse().getContentAsString();
        JsonNode t = mapper.readTree(task);

        mvc.perform(patch("/api/tasks/" + t.get("id").asLong() + "/move").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DONE\",\"position\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));

        mvc.perform(get("/api/projects/" + projectId).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.progress").value(100));
    }

    @Test
    void collaboratorCannotCreateWorkspaceNorAccessAdmin() throws Exception {
        String token = login("honore@taskflow.com", "User1234!");
        mvc.perform(post("/api/workspaces").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
