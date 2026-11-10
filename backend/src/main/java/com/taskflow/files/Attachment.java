package com.taskflow.files;

import com.taskflow.projects.Project;
import com.taskflow.tasks.Task;
import com.taskflow.users.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Pièce jointe rattachée à une tâche, ou document rattaché directement à un projet. */
@Entity
@Table(name = "attachments")
@EntityListeners(AttachmentFileCleaner.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false, unique = true)
    private String storedName;

    @Column(nullable = false)
    private String contentType;

    private long size;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
