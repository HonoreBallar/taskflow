package com.taskflow.admin;

import com.taskflow.projects.ProjectRepository;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.tasks.TaskStatus;
import com.taskflow.users.*;
import com.taskflow.workspace.WorkspaceRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Administration")
public class AdminController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ActivityLogRepository logRepository;
    private final CurrentUserService currentUser;

    @GetMapping("/users")
    public List<UserDto> users() {
        return userRepository.findAll(Sort.by("createdAt").descending()).stream().map(UserDto::from).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody UserDtos.AdminUserRequest req) {
        return userService.create(req, currentUser.get());
    }

    @PutMapping("/users/{id}")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UserDtos.AdminUserRequest req) {
        return userService.adminUpdate(id, req, currentUser.get());
    }

    @PatchMapping("/users/{id}/role")
    public UserDto role(@PathVariable Long id, @Valid @RequestBody UserDtos.RoleRequest req) {
        return userService.setRole(id, req.role(), currentUser.get());
    }

    @PatchMapping("/users/{id}/block")
    public UserDto block(@PathVariable Long id, @RequestBody UserDtos.BlockRequest req) {
        return userService.setBlocked(id, req.blocked(), currentUser.get());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id, currentUser.get());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/logs")
    public Page<ActivityLog> logs(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return logRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100))));
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("users", userRepository.count());
        stats.put("admins", userRepository.countByRole(Role.ADMIN));
        stats.put("managers", userRepository.countByRole(Role.MANAGER));
        stats.put("collaborators", userRepository.countByRole(Role.USER));
        stats.put("workspaces", workspaceRepository.count());
        stats.put("projects", projectRepository.count());
        stats.put("tasks", taskRepository.count());
        List<Long> allIds = projectRepository.findAll().stream().map(p -> p.getId()).toList();
        stats.put("doneTasks", allIds.isEmpty() ? 0 : taskRepository.countByProjectIdInAndStatus(allIds, TaskStatus.DONE));
        return stats;
    }
}
