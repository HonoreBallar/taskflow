package com.taskflow.comments;

import com.taskflow.comments.CommentDtos.*;
import com.taskflow.security.CurrentUserService;
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
@Tag(name = "Commentaires")
public class CommentController {

    private final CommentService service;
    private final CurrentUserService currentUser;

    @GetMapping("/tasks/{taskId}/comments")
    public List<CommentDto> list(@PathVariable Long taskId) {
        return service.list(currentUser.get(), taskId);
    }

    @PostMapping("/tasks/{taskId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto create(@PathVariable Long taskId, @Valid @RequestBody CommentRequest req) {
        return service.create(currentUser.get(), taskId, req);
    }

    @PutMapping("/comments/{id}")
    public CommentDto update(@PathVariable Long id, @Valid @RequestBody CommentRequest req) {
        return service.update(currentUser.get(), id, req);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }
}
