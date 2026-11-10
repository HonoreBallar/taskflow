package com.taskflow.tasks;

import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.TaskDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Tâches")
public class TaskController {

    private final TaskService service;
    private final CurrentUserService currentUser;

    @GetMapping("/projects/{projectId}/tasks")
    public List<TaskDto> listByProject(@PathVariable Long projectId) {
        return service.listByProject(currentUser.get(), projectId);
    }

    @PostMapping("/projects/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskDto create(@PathVariable Long projectId, @Valid @RequestBody TaskRequest req) {
        return service.create(currentUser.get(), projectId, req);
    }

    @GetMapping("/tasks/mine")
    public List<TaskDto> mine() {
        return service.myTasks(currentUser.get());
    }

    @GetMapping("/tasks/{id}")
    public TaskDto get(@PathVariable Long id) {
        return service.get(currentUser.get(), id);
    }

    @PutMapping("/tasks/{id}")
    public TaskDto update(@PathVariable Long id, @Valid @RequestBody TaskRequest req) {
        return service.update(currentUser.get(), id, req);
    }

    @PatchMapping("/tasks/{id}/move")
    public TaskDto move(@PathVariable Long id, @Valid @RequestBody MoveRequest req) {
        return service.move(currentUser.get(), id, req);
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }
}
