package com.taskflow.files;

import com.taskflow.users.UserDto;

import java.time.Instant;

public record AttachmentDto(Long id, String name, String contentType, long size, Long taskId, Long projectId,
                            UserDto uploadedBy, String url, boolean previewable, Instant createdAt) {

    public static AttachmentDto from(Attachment a) {
        boolean previewable = a.getContentType().startsWith("image/") || a.getContentType().equals("application/pdf");
        return new AttachmentDto(a.getId(), a.getOriginalName(), a.getContentType(), a.getSize(),
                a.getTask() != null ? a.getTask().getId() : null,
                a.getProject() != null ? a.getProject().getId() : null,
                UserDto.from(a.getUploadedBy()), "/api/files/" + a.getId(), previewable, a.getCreatedAt());
    }
}
