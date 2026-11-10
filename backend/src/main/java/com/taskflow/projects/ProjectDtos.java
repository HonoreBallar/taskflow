package com.taskflow.projects;

import com.taskflow.users.UserDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ProjectDtos {

    private ProjectDtos() {
    }

    public record ProjectRequest(
            @NotBlank(message = "Nom obligatoire") @Size(max = 150) String name,
            @Size(max = 2000) String description,
            LocalDate startDate,
            LocalDate endDate,
            @NotNull(message = "Workspace obligatoire") Long workspaceId,
            List<Long> memberIds) {
    }

    public record AddMemberRequest(@NotNull Long userId) {
    }

    public record ProjectDto(Long id, String name, String description, LocalDate startDate, LocalDate endDate,
                             Long workspaceId, String workspaceName, List<UserDto> members,
                             long taskCount, long doneCount, int progress, Instant createdAt) {

        public static ProjectDto from(Project p, long taskCount, long doneCount) {
            int progress = taskCount == 0 ? 0 : (int) Math.round(doneCount * 100.0 / taskCount);
            return new ProjectDto(p.getId(), p.getName(), p.getDescription(), p.getStartDate(), p.getEndDate(),
                    p.getWorkspace().getId(), p.getWorkspace().getName(),
                    p.getMembers().stream().map(UserDto::from).toList(),
                    taskCount, doneCount, progress, p.getCreatedAt());
        }
    }
}
