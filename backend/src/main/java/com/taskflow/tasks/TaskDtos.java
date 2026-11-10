package com.taskflow.tasks;

import com.taskflow.users.UserDto;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class TaskDtos {

    private TaskDtos() {
    }

    public record TaskRequest(
            @NotBlank(message = "Titre obligatoire") @Size(max = 200) String title,
            @Size(max = 5000) String description,
            TaskPriority priority,
            TaskStatus status,
            LocalDate dueDate,
            Long assigneeId,
            Boolean blocked) {
    }

    public record MoveRequest(@NotNull TaskStatus status, @Min(0) int position) {
    }

    public record TaskDto(Long id, String title, String description, TaskStatus status, TaskPriority priority,
                          LocalDate dueDate, int position, boolean blocked, boolean overdue,
                          UserDto assignee, Long projectId, String projectName, UserDto createdBy,
                          int commentCount, int attachmentCount, Instant createdAt, Instant updatedAt) {

        public static TaskDto from(Task t) {
            boolean overdue = t.getDueDate() != null && t.getStatus() != TaskStatus.DONE
                    && t.getDueDate().isBefore(LocalDate.now());
            return new TaskDto(t.getId(), t.getTitle(), t.getDescription(), t.getStatus(), t.getPriority(),
                    t.getDueDate(), t.getPosition(), t.isBlocked(), overdue,
                    UserDto.from(t.getAssignee()), t.getProject().getId(), t.getProject().getName(),
                    UserDto.from(t.getCreatedBy()), t.getComments().size(), t.getAttachments().size(),
                    t.getCreatedAt(), t.getUpdatedAt());
        }
    }
}
