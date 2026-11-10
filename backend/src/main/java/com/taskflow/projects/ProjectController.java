package com.taskflow.projects;

import com.taskflow.projects.ProjectDtos.*;
import com.taskflow.security.CurrentUserService;
import com.taskflow.users.UserDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projets")
public class ProjectController {

    private final ProjectService service;
    private final CurrentUserService currentUser;

    @GetMapping
    public List<ProjectDto> list(@RequestParam(required = false) Long workspaceId) {
        return service.list(currentUser.get(), workspaceId);
    }

    @GetMapping("/{id}")
    public ProjectDto get(@PathVariable Long id) {
        return service.get(currentUser.get(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectDto create(@Valid @RequestBody ProjectRequest req) {
        return service.create(currentUser.get(), req);
    }

    @PutMapping("/{id}")
    public ProjectDto update(@PathVariable Long id, @Valid @RequestBody ProjectRequest req) {
        return service.update(currentUser.get(), id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public List<UserDto> members(@PathVariable Long id) {
        return service.members(currentUser.get(), id);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto addMember(@PathVariable Long id, @Valid @RequestBody AddMemberRequest req) {
        return service.addMember(currentUser.get(), id, req.userId());
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        service.removeMember(currentUser.get(), id, userId);
        return ResponseEntity.noContent().build();
    }
}
