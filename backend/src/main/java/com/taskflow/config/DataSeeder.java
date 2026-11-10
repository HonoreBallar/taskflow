package com.taskflow.config;

import com.taskflow.projects.Project;
import com.taskflow.projects.ProjectRepository;
import com.taskflow.tasks.Task;
import com.taskflow.tasks.TaskPriority;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.tasks.TaskStatus;
import com.taskflow.users.Role;
import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import com.taskflow.workspace.Workspace;
import com.taskflow.workspace.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;

/**
 * Au premier démarrage, crée le compte administrateur. Les données de démonstration (comptes aux mots de
 * passe publics, documentés dans le README) ne sont créées que si SEED_DEMO=true : jamais en production.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final WorkspaceRepository workspaces;
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final PasswordEncoder encoder;

    @Value("${taskflow.admin.email}")
    private String adminEmail;

    @Value("${taskflow.admin.password:}")
    private String adminPassword;

    @Value("${taskflow.seed-demo:false}")
    private boolean seedDemo;

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;

        String password = adminPassword;
        if (password == null || password.isBlank()) {
            byte[] raw = new byte[18];
            new SecureRandom().nextBytes(raw);
            password = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
            log.warn("ADMIN_PASSWORD non défini : compte {} créé avec le mot de passe généré « {} ». "
                    + "Changez-le dès la première connexion.", adminEmail, password);
        }
        User admin = users.save(User.builder().firstname("Admin").lastname("TaskFlow")
                .email(adminEmail.toLowerCase()).password(encoder.encode(password)).role(Role.ADMIN).build());
        log.info("Compte administrateur créé : {}", adminEmail);

        if (seedDemo) seedDemoData(admin);
    }

    private void seedDemoData(User admin) {
        User manager = users.save(User.builder().firstname("Marie").lastname("Kouassi")
                .email("manager@taskflow.com").password(encoder.encode("Manager123!")).role(Role.MANAGER).build());
        User honore = users.save(User.builder().firstname("Honore").lastname("Amounan")
                .email("honore@taskflow.com").password(encoder.encode("User1234!")).role(Role.USER).build());

        Workspace ens = Workspace.builder().name("ENS").description("Organisation principale").owner(manager).build();
        ens.getMembers().add(honore);
        ens.getMembers().add(admin);
        ens = workspaces.save(ens);

        Project erp = Project.builder().name("ERP").description("Refonte de l'ERP interne")
                .startDate(LocalDate.now().minusWeeks(2)).endDate(LocalDate.now().plusMonths(2)).workspace(ens).build();
        erp.getMembers().add(manager);
        erp.getMembers().add(honore);
        erp = projects.save(erp);

        Project site = Project.builder().name("Site vitrine").description("Nouveau site institutionnel")
                .startDate(LocalDate.now()).endDate(LocalDate.now().plusMonths(1)).workspace(ens).build();
        site.getMembers().add(manager);
        site = projects.save(site);

        Object[][] demo = {
                {"Recueillir les besoins", TaskStatus.DONE, TaskPriority.HIGH, -5},
                {"Modéliser la base de données", TaskStatus.DONE, TaskPriority.HIGH, -2},
                {"Développer l'authentification", TaskStatus.IN_PROGRESS, TaskPriority.CRITICAL, 3},
                {"Écran de facturation", TaskStatus.TODO, TaskPriority.MEDIUM, 10},
                {"Revue sécurité", TaskStatus.REVIEW, TaskPriority.HIGH, 1},
                {"Export comptable", TaskStatus.BACKLOG, TaskPriority.LOW, 30},
                {"Migration des données", TaskStatus.TODO, TaskPriority.HIGH, -1},
        };
        int[] positions = new int[TaskStatus.values().length];
        for (Object[] d : demo) {
            TaskStatus status = (TaskStatus) d[1];
            tasks.save(Task.builder().title((String) d[0]).status(status).priority((TaskPriority) d[2])
                    .dueDate(LocalDate.now().plusDays((Integer) d[3])).project(erp).createdBy(manager)
                    .assignee(honore).position(positions[status.ordinal()]++).build());
        }
        tasks.save(Task.builder().title("Maquettes de la page d'accueil").status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.MEDIUM).project(site).createdBy(manager).assignee(manager).blocked(true).build());

        log.warn("Données de démonstration créées (SEED_DEMO=true) : comptes manager@taskflow.com et "
                + "honore@taskflow.com aux mots de passe publics. À ne pas utiliser en production.");
    }
}
