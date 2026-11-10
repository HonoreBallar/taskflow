package com.taskflow.comments;

import com.taskflow.users.UserDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class CommentDtos {

    private CommentDtos() {
    }

    public record CommentRequest(
            @NotBlank(message = "Commentaire vide") @Size(max = 4000) String content,
            Long parentId) {
    }

    public record CommentDto(Long id, String content, UserDto author, Long taskId, Long parentId,
                             Instant createdAt, Instant updatedAt) {
        public static CommentDto from(Comment c) {
            return new CommentDto(c.getId(), c.getContent(), UserDto.from(c.getUser()), c.getTask().getId(),
                    c.getParent() != null ? c.getParent().getId() : null, c.getCreatedAt(), c.getUpdatedAt());
        }
    }
}
