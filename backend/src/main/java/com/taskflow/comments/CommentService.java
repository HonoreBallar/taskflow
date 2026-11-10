package com.taskflow.comments;

import com.taskflow.comments.CommentDtos.*;
import com.taskflow.common.ApiException;
import com.taskflow.notifications.NotificationService;
import com.taskflow.notifications.NotificationType;
import com.taskflow.security.AccessService;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.Task;
import com.taskflow.tasks.TaskService;
import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import com.taskflow.workspace.Workspace;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CommentService {

    /** Mention : @prenom ou @debut-de-l-email (ex : @honore) */
    public static final Pattern MENTION = Pattern.compile("@([\\p{L}0-9._-]+)");

    private final CommentRepository repository;
    private final TaskService taskService;
    private final UserRepository userRepository;
    private final AccessService access;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public List<CommentDto> list(User user, Long taskId) {
        Task task = taskService.getEntity(taskId);
        access.requireViewProject(user, task.getProject());
        return repository.findByTaskIdOrderByCreatedAtAsc(taskId).stream().map(CommentDto::from).toList();
    }

    @Transactional
    public CommentDto create(User user, Long taskId, CommentRequest req) {
        Task task = taskService.getEntity(taskId);
        access.requireViewProject(user, task.getProject());

        Comment parent = null;
        if (req.parentId() != null) {
            parent = repository.findById(req.parentId()).orElseThrow(() -> ApiException.notFound("Commentaire parent"));
            if (!parent.getTask().getId().equals(taskId)) throw ApiException.badRequest("Commentaire parent invalide");
        }

        Comment saved = repository.save(Comment.builder()
                .content(req.content().trim())
                .user(userRepository.getReferenceById(user.getId()))
                .task(task)
                .parent(parent)
                .build());

        String link = "/projects/" + task.getProject().getId() + "/board?task=" + task.getId();
        Set<Long> notified = new HashSet<>();
        notified.add(user.getId());

        for (User mentioned : resolveMentions(saved.getContent(), task.getProject().getWorkspace())) {
            if (notified.add(mentioned.getId())) {
                notifications.notify(mentioned, user, NotificationType.MENTION,
                        user.getFullName() + " vous a mentionné sur « " + task.getTitle() + " »", link);
            }
        }
        if (parent != null && parent.getUser() != null && notified.add(parent.getUser().getId())) {
            notifications.notify(parent.getUser(), user, NotificationType.COMMENT_ADDED,
                    user.getFullName() + " a répondu à votre commentaire sur « " + task.getTitle() + " »", link);
        }
        if (task.getAssignee() != null && notified.add(task.getAssignee().getId())) {
            notifications.notify(task.getAssignee(), user, NotificationType.COMMENT_ADDED,
                    user.getFullName() + " a commenté « " + task.getTitle() + " »", link);
        }
        return CommentDto.from(saved);
    }

    @Transactional
    public CommentDto update(User user, Long id, CommentRequest req) {
        Comment c = getOwned(user, id);
        c.setContent(req.content().trim());
        c.setUpdatedAt(Instant.now());
        return CommentDto.from(c);
    }

    @Transactional
    public void delete(User user, Long id) {
        repository.delete(getOwned(user, id));
    }

    private Comment getOwned(User user, Long id) {
        Comment c = repository.findById(id).orElseThrow(() -> ApiException.notFound("Commentaire"));
        boolean author = c.getUser() != null && c.getUser().getId().equals(user.getId());
        if (!author && !CurrentUserService.isAdmin(user)) throw ApiException.forbidden();
        // L'auteur doit encore avoir accès au projet (il peut avoir été retiré du workspace)
        access.requireViewProject(user, c.getTask().getProject());
        return c;
    }

    /** Résout les @mentions parmi les membres du workspace (prénom ou partie locale de l'email). */
    List<User> resolveMentions(String content, Workspace w) {
        Matcher m = MENTION.matcher(content);
        Set<String> handles = new HashSet<>();
        while (m.find()) handles.add(m.group(1).toLowerCase(Locale.ROOT));
        if (handles.isEmpty()) return List.of();

        List<User> candidates = new ArrayList<>(w.getMembers());
        candidates.add(w.getOwner());
        return candidates.stream().filter(u -> {
            String first = u.getFirstname().toLowerCase(Locale.ROOT);
            String local = u.getEmail().substring(0, u.getEmail().indexOf('@')).toLowerCase(Locale.ROOT);
            return handles.contains(first) || handles.contains(local);
        }).distinct().toList();
    }
}
