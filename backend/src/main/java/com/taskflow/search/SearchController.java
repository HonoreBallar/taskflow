package com.taskflow.search;

import com.taskflow.projects.Project;
import com.taskflow.projects.ProjectRepository;
import com.taskflow.projects.ProjectService;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.users.User;
import com.taskflow.users.UserDto;
import com.taskflow.users.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Recherche globale")
public class SearchController {

    private static final int LIMIT = 6;

    private final ProjectService projectService;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUser;

    public record ProjectHit(Long id, String name, String workspaceName) {
    }

    public record TaskHit(Long id, String title, Long projectId, String projectName, String status) {
    }

    public record SearchResult(List<ProjectHit> projects, List<TaskHit> tasks, List<UserDto> users) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    public SearchResult search(@RequestParam String q) {
        String query = q.trim();
        if (query.length() < 2) return new SearchResult(List.of(), List.of(), List.of());
        User user = currentUser.get();
        boolean admin = CurrentUserService.isAdmin(user);

        List<ProjectHit> projects = projectRepository.search(query, user.getId(), admin).stream().limit(LIMIT)
                .map(p -> new ProjectHit(p.getId(), p.getName(), p.getWorkspace().getName())).toList();

        List<Long> ids = projectService.accessibleProjects(user).stream().map(Project::getId).toList();
        List<TaskHit> tasks = ids.isEmpty() ? List.of() : taskRepository.search(query, ids).stream().limit(LIMIT)
                .map(t -> new TaskHit(t.getId(), t.getTitle(), t.getProject().getId(), t.getProject().getName(),
                        t.getStatus().name())).toList();

        List<UserDto> users = userRepository.search(query, user.getId(), admin).stream().limit(LIMIT).map(UserDto::from).toList();
        return new SearchResult(projects, tasks, users);
    }
}
