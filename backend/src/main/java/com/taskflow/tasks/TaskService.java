package com.taskflow.tasks;

import com.taskflow.admin.ActivityLogService;
import com.taskflow.common.ApiException;
import com.taskflow.notifications.NotificationService;
import com.taskflow.notifications.NotificationType;
import com.taskflow.projects.Project;
import com.taskflow.projects.ProjectService;
import com.taskflow.security.AccessService;
import com.taskflow.tasks.TaskDtos.*;
import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository repository;
    private final ProjectService projectService;
    private final UserRepository userRepository;
    private final AccessService access;
    private final NotificationService notifications;
    private final ActivityLogService activityLog;

    public Task getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Tâche"));
    }

    @Transactional(readOnly = true)
    public List<TaskDto> listByProject(User user, Long projectId) {
        Project p = projectService.getEntity(projectId);
        access.requireViewProject(user, p);
        return repository.findByProjectIdOrderByStatusAscPositionAsc(projectId).stream().map(TaskDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDto> myTasks(User user) {
        return repository.findByAssigneeIdOrderByDueDateAsc(user.getId()).stream()
                .filter(t -> access.canViewProject(user, t.getProject()))
                .map(TaskDto::from).toList();
    }

    @Transactional(readOnly = true)
    public TaskDto get(User user, Long id) {
        Task t = getEntity(id);
        access.requireViewProject(user, t.getProject());
        return TaskDto.from(t);
    }

    @Transactional
    public TaskDto create(User user, Long projectId, TaskRequest req) {
        Project p = projectService.getEntity(projectId);
        access.requireManageProject(user, p);
        TaskStatus status = req.status() != null ? req.status() : TaskStatus.TODO;

        Task t = Task.builder()
                .title(req.title().trim())
                .description(req.description())
                .priority(req.priority() != null ? req.priority() : TaskPriority.MEDIUM)
                .status(status)
                .dueDate(req.dueDate())
                .blocked(Boolean.TRUE.equals(req.blocked()))
                .project(p)
                .createdBy(userRepository.getReferenceById(user.getId()))
                .position(repository.maxPosition(projectId, status) + 1)
                .assignee(resolveAssignee(p, req.assigneeId()))
                .build();
        Task saved = repository.save(t);

        // Notifie les membres du projet de la nouvelle tâche, et l'assigné de son affectation
        String link = "/projects/" + p.getId() + "/board?task=" + saved.getId();
        for (User member : p.getMembers()) {
            if (saved.getAssignee() != null && member.getId().equals(saved.getAssignee().getId())) continue;
            notifications.notify(member, user, NotificationType.TASK_CREATED,
                    "Nouvelle tâche « " + saved.getTitle() + " » dans " + p.getName(), link);
        }
        if (saved.getAssignee() != null) {
            notifications.notify(saved.getAssignee(), user, NotificationType.TASK_ASSIGNED,
                    user.getFullName() + " vous a affecté la tâche « " + saved.getTitle() + " »", link);
        }
        activityLog.log(user, "a créé la tâche " + saved.getTitle() + " (" + p.getName() + ")");
        return TaskDto.from(saved);
    }

    @Transactional
    public TaskDto update(User user, Long id, TaskRequest req) {
        Task t = getEntity(id);
        access.requireEditTask(user, t);
        boolean manager = access.canManageProject(user, t.getProject());

        t.setTitle(req.title().trim());
        t.setDescription(req.description());
        if (req.priority() != null) t.setPriority(req.priority());
        if (req.blocked() != null) t.setBlocked(req.blocked());
        t.setDueDate(req.dueDate());
        if (req.status() != null && req.status() != t.getStatus()) {
            reorder(t, req.status(), Integer.MAX_VALUE);
        }

        // Seul un manager peut (ré)affecter une tâche
        if (manager) {
            Long previous = t.getAssignee() != null ? t.getAssignee().getId() : null;
            if (!Objects.equals(previous, req.assigneeId())) {
                t.setAssignee(resolveAssignee(t.getProject(), req.assigneeId()));
                if (t.getAssignee() != null) {
                    notifications.notify(t.getAssignee(), user, NotificationType.TASK_ASSIGNED,
                            user.getFullName() + " vous a affecté la tâche « " + t.getTitle() + " »",
                            "/projects/" + t.getProject().getId() + "/board?task=" + t.getId());
                    activityLog.log(user, "a affecté la tâche " + t.getTitle() + " à " + t.getAssignee().getFullName());
                }
            }
        }
        return TaskDto.from(t);
    }

    /** Déplacement Kanban : change de colonne et/ou de position puis renumérote les colonnes concernées. */
    @Transactional
    public TaskDto move(User user, Long id, MoveRequest req) {
        Task t = getEntity(id);
        access.requireEditTask(user, t);
        reorder(t, req.status(), req.position());
        return TaskDto.from(t);
    }

    @Transactional
    public void delete(User user, Long id) {
        Task t = getEntity(id);
        access.requireManageProject(user, t.getProject());
        activityLog.log(user, "a supprimé la tâche " + t.getTitle());
        TaskStatus status = t.getStatus();
        Long projectId = t.getProject().getId();
        repository.delete(t);
        repository.flush();
        renumber(repository.findByProjectIdAndStatusOrderByPositionAsc(projectId, status));
    }

    private void reorder(Task t, TaskStatus target, int position) {
        Long projectId = t.getProject().getId();
        TaskStatus source = t.getStatus();

        List<Task> targetColumn = new ArrayList<>(repository.findByProjectIdAndStatusOrderByPositionAsc(projectId, target));
        targetColumn.removeIf(x -> x.getId().equals(t.getId()));
        int index = Math.max(0, Math.min(position, targetColumn.size()));
        targetColumn.add(index, t);
        t.setStatus(target);
        renumber(targetColumn);

        if (source != target) {
            List<Task> sourceColumn = new ArrayList<>(repository.findByProjectIdAndStatusOrderByPositionAsc(projectId, source));
            sourceColumn.removeIf(x -> x.getId().equals(t.getId()));
            renumber(sourceColumn);
        }
    }

    private void renumber(List<Task> column) {
        for (int i = 0; i < column.size(); i++) column.get(i).setPosition(i);
    }

    private User resolveAssignee(Project p, Long assigneeId) {
        if (assigneeId == null) return null;
        User u = userRepository.findById(assigneeId).orElseThrow(() -> ApiException.notFound("Utilisateur"));
        if (!access.isWorkspaceMember(u, p.getWorkspace())) {
            throw ApiException.badRequest("Le responsable doit être membre du workspace");
        }
        return u;
    }
}
