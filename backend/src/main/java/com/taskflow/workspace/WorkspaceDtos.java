package com.taskflow.workspace;

import com.taskflow.users.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class WorkspaceDtos {

    private WorkspaceDtos() {
    }

    public record WorkspaceRequest(
            @NotBlank(message = "Nom obligatoire") @Size(max = 120) String name,
            @Size(max = 1000) String description) {
    }

    public record InviteRequest(@NotBlank @Email(message = "Email invalide") String email) {
    }

    public record WorkspaceDto(Long id, String name, String description, Long owner, UserDto ownerUser,
                               int memberCount, int projectCount, Instant createdAt) {
        public static WorkspaceDto from(Workspace w) {
            return new WorkspaceDto(w.getId(), w.getName(), w.getDescription(), w.getOwner().getId(),
                    UserDto.from(w.getOwner()), w.getMembers().size() + 1, w.getProjects().size(), w.getCreatedAt());
        }
    }
}
