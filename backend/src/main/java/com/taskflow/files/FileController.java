package com.taskflow.files;

import com.taskflow.common.ApiException;
import com.taskflow.projects.Project;
import com.taskflow.projects.ProjectService;
import com.taskflow.security.AccessService;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.Task;
import com.taskflow.tasks.TaskService;
import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Pièces jointes")
public class FileController {

    private final AttachmentRepository repository;
    private final FileStorageService storage;
    private final TaskService taskService;
    private final ProjectService projectService;
    private final UserRepository userRepository;
    private final AccessService access;
    private final CurrentUserService currentUser;

    @GetMapping("/tasks/{taskId}/attachments")
    @Transactional(readOnly = true)
    public List<AttachmentDto> listForTask(@PathVariable Long taskId) {
        Task t = taskService.getEntity(taskId);
        access.requireViewProject(currentUser.get(), t.getProject());
        return repository.findByTaskIdOrderByCreatedAtDesc(taskId).stream().map(AttachmentDto::from).toList();
    }

    @PostMapping(value = "/tasks/{taskId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AttachmentDto uploadForTask(@PathVariable Long taskId, @RequestParam("file") MultipartFile file) {
        User user = currentUser.get();
        Task t = taskService.getEntity(taskId);
        access.requireViewProject(user, t.getProject());
        return save(user, file, t, null);
    }

    @GetMapping("/projects/{projectId}/attachments")
    @Transactional(readOnly = true)
    public List<AttachmentDto> listForProject(@PathVariable Long projectId) {
        Project p = projectService.getEntity(projectId);
        access.requireViewProject(currentUser.get(), p);
        return repository.findByProjectIdOrderByCreatedAtDesc(projectId).stream().map(AttachmentDto::from).toList();
    }

    @PostMapping(value = "/projects/{projectId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AttachmentDto uploadForProject(@PathVariable Long projectId, @RequestParam("file") MultipartFile file) {
        User user = currentUser.get();
        Project p = projectService.getEntity(projectId);
        access.requireViewProject(user, p);
        return save(user, file, null, p);
    }

    /** Téléchargement ; ?inline=true pour la prévisualisation (PDF, images) dans le navigateur. */
    @GetMapping("/files/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> download(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean inline) {
        Attachment a = getAccessible(id);
        Resource resource = storage.load(a.getStoredName());
        // Seuls les PDF et les images peuvent s'afficher dans le navigateur ; tout le reste est téléchargé.
        boolean previewable = a.getContentType().startsWith("image/") || a.getContentType().equals("application/pdf");
        ContentDisposition disposition = (inline && previewable ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(a.getOriginalName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    @DeleteMapping("/files/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User user = currentUser.get();
        Attachment a = getAccessible(id);
        Project p = a.getProject() != null ? a.getProject() : a.getTask().getProject();
        boolean owner = a.getUploadedBy() != null && a.getUploadedBy().getId().equals(user.getId());
        if (!owner && !access.canManageProject(user, p)) throw ApiException.forbidden();
        repository.delete(a); // le fichier est supprimé du disque par AttachmentFileCleaner
        return ResponseEntity.noContent().build();
    }

    private Attachment getAccessible(Long id) {
        Attachment a = repository.findById(id).orElseThrow(() -> ApiException.notFound("Fichier"));
        Project p = a.getProject() != null ? a.getProject() : a.getTask().getProject();
        access.requireViewProject(currentUser.get(), p);
        return a;
    }

    private AttachmentDto save(User user, MultipartFile file, Task task, Project project) {
        FileStorageService.StoredFile stored = storage.store(file, FileStorageService.ALLOWED.keySet());
        Attachment a = repository.save(Attachment.builder()
                .originalName(stored.originalName())
                .storedName(stored.storedName())
                .contentType(stored.contentType())
                .size(stored.size())
                .task(task)
                .project(project)
                .uploadedBy(userRepository.getReferenceById(user.getId()))
                .build());
        return AttachmentDto.from(a);
    }
}
