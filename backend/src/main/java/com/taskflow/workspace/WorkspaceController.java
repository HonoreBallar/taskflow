package com.taskflow.workspace;

import com.taskflow.security.CurrentUserService;
import com.taskflow.users.UserDto;
import com.taskflow.workspace.WorkspaceDtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@Tag(name = "Espaces de travail")
public class WorkspaceController {

    private final WorkspaceService service;
    private final CurrentUserService currentUser;

    @GetMapping
    public List<WorkspaceDto> list() {
        return service.list(currentUser.get());
    }

    @GetMapping("/{id}")
    public WorkspaceDto get(@PathVariable Long id) {
        return service.get(currentUser.get(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceDto create(@Valid @RequestBody WorkspaceRequest req) {
        return service.create(currentUser.get(), req);
    }

    @PutMapping("/{id}")
    public WorkspaceDto update(@PathVariable Long id, @Valid @RequestBody WorkspaceRequest req) {
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
    public UserDto invite(@PathVariable Long id, @Valid @RequestBody InviteRequest req) {
        return service.invite(currentUser.get(), id, req);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        service.removeMember(currentUser.get(), id, userId);
        return ResponseEntity.noContent().build();
    }
}
