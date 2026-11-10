package com.taskflow.files;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByTaskIdOrderByCreatedAtDesc(Long taskId);

    List<Attachment> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    @Modifying
    @Query("update Attachment a set a.uploadedBy = null where a.uploadedBy.id = :userId")
    void clearUploader(@Param("userId") Long userId);
}
