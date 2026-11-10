package com.taskflow.projects;

import com.taskflow.admin.ActivityLogService;
import com.taskflow.common.ApiException;
import com.taskflow.notifications.NotificationService;
import com.taskflow.notifications.NotificationType;
import com.taskflow.projects.ProjectDtos.*;
import com.taskflow.security.AccessService;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.tasks.TaskStatus;
import com.taskflow.users.User;
import com.taskflow.users.UserDto;
import com.taskflow.users.UserRepository;
import com.taskflow.workspace.Workspace;
import com.taskflow.workspace.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository repository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;
    private final AccessService access;
    private final NotificationService notifications;
    private final ActivityLogService activityLog;

    public Project getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Projet"));
    }

    /** Projets visibles par l'utilisateur (tous pour un admin). */
    @Transactional(readOnly = true)
    public List<Project> accessibleProjects(User user) {
        return CurrentUserService.isAdmin(user) ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findAccessible(user.getId());
    }

    @Transactional(readOnly = true)
    public List<ProjectDto> list(User user, Long workspaceId) {
        List<Project> projects;
        if (workspaceId != null) {
            Workspace w = workspaceService.getEntity(workspaceId);
            access.requireViewWorkspace(user, w);
            projects = repository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        } else {
            projects = accessibleProjects(user);
        }
        return toDtos(projects);
    }

    @Transactional(readOnly = true)
    public ProjectDto get(User user, Long id) {
        Project p = getEntity(id);
        access.requireViewProject(user, p);
        return toDtos(List.of(p)).get(0);
    }

    @Transactional
    public ProjectDto create(User user, ProjectRequest req) {
        CurrentUserService.requireManager(user);
        Workspace w = workspaceService.getEntity(req.workspaceId());
        if (!access.canManageWorkspace(user, w) && !access.isWorkspaceMember(user, w)) throw ApiException.forbidden();
        validateDates(req);

        Project p = Project.builder()
                .name(req.name().trim()).description(req.description())
                .startDate(req.startDate()).endDate(req.endDate()).workspace(w)
                .build();
        p.getMembers().add(userRepository.getReferenceById(user.getId()));
        Project saved = repository.save(p);
        addMembers(user, saved, req.memberIds());
        activityLog.log(user, "a créé le projet " + saved.getName());
        return ProjectDto.from(saved, 0, 0);
    }

    @Transactional
    public ProjectDto update(User user, Long id, ProjectRequest req) {
        Project p = getEntity(id);
        access.requireManageProject(user, p);
        validateDates(req);
        p.setName(req.name().trim());
        p.setDescription(req.description());
        p.setStartDate(req.startDate());
        p.setEndDate(req.endDate());
        if (req.memberIds() != null) {
            Set<Long> wanted = new HashSet<>(req.memberIds());
            p.getMembers().removeIf(m -> !wanted.contains(m.getId()));
            addMembers(user, p, req.memberIds());
        }
        return toDtos(List.of(p)).get(0);
    }

    @Transactional
    public void delete(User user, Long id) {
        Project p = getEntity(id);
        access.requireManageProject(user, p);
        activityLog.log(user, "a supprimé le projet " + p.getName());
        repository.delete(p);
    }

    @Transactional(readOnly = true)
    public List<UserDto> members(User user, Long id) {
        Project p = getEntity(id);
        access.requireViewProject(user, p);
        return p.getMembers().stream().map(UserDto::from).toList();
    }

    @Transactional
    public UserDto addMember(User user, Long id, Long userId) {
        Project p = getEntity(id);
        access.requireManageProject(user, p);
        addMembers(user, p, List.of(userId));
        return UserDto.from(userRepository.findById(userId).orElseThrow());
    }

    @Transactional
    public void removeMember(User user, Long id, Long userId) {
        Project p = getEntity(id);
        access.requireManageProject(user, p);
        p.getMembers().removeIf(m -> m.getId().equals(userId));
    }

    private void addMembers(User actor, Project p, List<Long> ids) {
        if (ids == null) return;
        for (Long uid : ids) {
            if (p.getMembers().stream().anyMatch(m -> m.getId().equals(uid))) continue;
            User u = userRepository.findById(uid).orElseThrow(() -> ApiException.notFound("Utilisateur"));
            if (!access.isWorkspaceMember(u, p.getWorkspace())) {
                throw ApiException.badRequest(u.getFullName() + " n'est pas membre du workspace");
            }
            p.getMembers().add(u);
            notifications.notify(u, actor, NotificationType.PROJECT_INVITATION,
                    actor.getFullName() + " vous a ajouté au projet « " + p.getName() + " »",
                    "/projects/" + p.getId());
        }
    }

    private void validateDates(ProjectRequest req) {
        if (req.startDate() != null && req.endDate() != null && req.endDate().isBefore(req.startDate())) {
            throw ApiException.badRequest("La date de fin doit être postérieure à la date de début");
        }
    }

    /** Calcule la progression de chaque projet en une seule requête groupée. */
    public List<ProjectDto> toDtos(List<Project> projects) {
        if (projects.isEmpty()) return List.of();
        Map<Long, long[]> counts = new HashMap<>();
        for (Object[] row : taskRepository.countByProjectAndStatus(projects.stream().map(Project::getId).toList())) {
            Long pid = (Long) row[0];
            TaskStatus status = (TaskStatus) row[1];
            long c = (Long) row[2];
            long[] arr = counts.computeIfAbsent(pid, k -> new long[2]);
            arr[0] += c;
            if (status == TaskStatus.DONE) arr[1] += c;
        }
        return projects.stream().map(p -> {
            long[] c = counts.getOrDefault(p.getId(), new long[2]);
            return ProjectDto.from(p, c[0], c[1]);
        }).toList();
    }
}
