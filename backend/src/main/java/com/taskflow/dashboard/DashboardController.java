package com.taskflow.dashboard;

import com.taskflow.projects.Project;
import com.taskflow.projects.ProjectDtos.ProjectDto;
import com.taskflow.projects.ProjectService;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.tasks.TaskStatus;
import com.taskflow.users.User;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard")
public class DashboardController {

    private final ProjectService projectService;
    private final TaskRepository taskRepository;
    private final CurrentUserService currentUser;

    public record ProjectProgress(Long id, String name, int progress, long taskCount, long doneCount) {
    }

    public record DashboardDto(long projectCount, long taskCount, long doneCount, long overdueCount,
                               long inProgressCount, long blockedCount,
                               Map<TaskStatus, Long> tasksByStatus, List<ProjectProgress> projects) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    public DashboardDto dashboard() {
        User user = currentUser.get();
        List<Project> projects = projectService.accessibleProjects(user);
        List<Long> ids = projects.stream().map(Project::getId).toList();

        Map<TaskStatus, Long> byStatus = new EnumMap<>(TaskStatus.class);
        for (TaskStatus s : TaskStatus.values()) byStatus.put(s, 0L);
        if (ids.isEmpty()) {
            return new DashboardDto(0, 0, 0, 0, 0, 0, byStatus, List.of());
        }
        for (Object[] row : taskRepository.countByStatus(ids)) {
            byStatus.put((TaskStatus) row[0], (Long) row[1]);
        }
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long done = byStatus.get(TaskStatus.DONE);
        long blocked = taskRepository.countByProjectIdInAndBlockedTrueAndStatusNot(ids, TaskStatus.DONE);
        long inProgress = byStatus.get(TaskStatus.IN_PROGRESS) + byStatus.get(TaskStatus.REVIEW);
        long overdue = taskRepository.countOverdue(ids, LocalDate.now());

        List<ProjectProgress> progress = projectService.toDtos(projects).stream()
                .map((ProjectDto p) -> new ProjectProgress(p.id(), p.name(), p.progress(), p.taskCount(), p.doneCount()))
                .toList();

        return new DashboardDto(projects.size(), total, done, overdue, inProgress, blocked, byStatus, progress);
    }
}
