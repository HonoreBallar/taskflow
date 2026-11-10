package com.taskflow.users;

import com.taskflow.admin.ActivityLogService;
import com.taskflow.auth.EmailTokenRepository;
import com.taskflow.auth.EmailVerificationService;
import com.taskflow.auth.PasswordResetTokenRepository;
import com.taskflow.comments.CommentRepository;
import com.taskflow.common.ApiException;
import com.taskflow.common.PasswordPolicy;
import com.taskflow.files.AttachmentRepository;
import com.taskflow.files.FileStorageService;
import com.taskflow.notifications.NotificationRepository;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.workspace.WorkspaceRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService storage;
    private final WorkspaceRepository workspaceRepository;
    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final AttachmentRepository attachmentRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailTokenRepository emailTokenRepository;
    private final EmailVerificationService verification;
    private final ActivityLogService activityLog;
    private final EntityManager em;

    public User getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur"));
    }

    @Transactional
    public UserDto updateProfile(User current, UserDtos.ProfileRequest req) {
        User u = getEntity(current.getId());
        String email = req.email().trim().toLowerCase();
        if (!email.equalsIgnoreCase(u.getEmail()) && repository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Cet email est déjà utilisé");
        }
        u.setFirstname(req.firstname().trim());
        u.setLastname(req.lastname().trim());
        if (!email.equals(u.getEmail())) {
            // Changer l'identifiant de connexion est une action sensible : une session volée ou laissée
            // ouverte ne suffit pas, il faut prouver que l'on connaît le mot de passe.
            if (req.currentPassword() == null || PasswordPolicy.tooLong(req.currentPassword())
                    || !passwordEncoder.matches(req.currentPassword(), u.getPassword())) {
                throw ApiException.badRequest("Mot de passe actuel incorrect : il est requis pour changer d'adresse email");
            }
            if (verification.isEnabled()) {
                // L'adresse actuelle reste en vigueur tant que la nouvelle n'a pas été confirmée par son lien
                verification.sendEmailChangeLink(u, email);
            } else {
                u.setEmail(email);
                invalidateSessions(u); // l'identifiant de connexion change : les sessions ouvertes sont fermées
            }
        }
        return UserDto.from(u);
    }

    @Transactional
    public void changePassword(User current, UserDtos.ChangePasswordRequest req) {
        User u = getEntity(current.getId());
        if (PasswordPolicy.tooLong(req.currentPassword())
                || !passwordEncoder.matches(req.currentPassword(), u.getPassword())) {
            throw ApiException.badRequest("Mot de passe actuel incorrect");
        }
        PasswordPolicy.validate(req.newPassword());
        u.setPassword(passwordEncoder.encode(req.newPassword()));
        invalidateSessions(u);
        activityLog.log(u, "a modifié son mot de passe");
    }

    @Transactional
    public UserDto uploadAvatar(User current, MultipartFile file) {
        User u = getEntity(current.getId());
        FileStorageService.StoredFile stored = storage.store(file, FileStorageService.IMAGE_EXT);
        storage.delete(u.getAvatarPath());
        u.setAvatarPath(stored.storedName());
        return UserDto.from(u);
    }

    // ---------- Administration ----------

    @Transactional
    public UserDto create(UserDtos.AdminUserRequest req, User actor) {
        String email = req.email().trim().toLowerCase();
        if (repository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Cet email est déjà utilisé");
        }
        PasswordPolicy.validate(req.password());
        User u = repository.save(User.builder()
                .firstname(req.firstname().trim()).lastname(req.lastname().trim()).email(email)
                .password(passwordEncoder.encode(req.password()))
                .role(req.role() != null ? req.role() : Role.USER)
                .build());
        activityLog.log(actor, "a créé l'utilisateur " + u.getFullName());
        return UserDto.from(u);
    }

    @Transactional
    public UserDto adminUpdate(Long id, UserDtos.AdminUserRequest req, User actor) {
        User u = getEntity(id);
        String email = req.email().trim().toLowerCase();
        if (!email.equalsIgnoreCase(u.getEmail()) && repository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Cet email est déjà utilisé");
        }
        u.setFirstname(req.firstname().trim());
        u.setLastname(req.lastname().trim());
        if (!email.equals(u.getEmail())) {
            u.setEmail(email);
            invalidateSessions(u);
        }
        if (req.role() != null && req.role() != u.getRole()) {
            preventSelfDemotion(u, actor, req.role());
            u.setRole(req.role());
            activityLog.log(actor, "a changé le rôle de " + u.getFullName() + " en " + req.role());
        }
        if (req.password() != null && !req.password().isBlank()) {
            PasswordPolicy.validate(req.password());
            u.setPassword(passwordEncoder.encode(req.password()));
            invalidateSessions(u);
            activityLog.log(actor, "a réinitialisé le mot de passe de " + u.getFullName());
        }
        return UserDto.from(u);
    }

    @Transactional
    public UserDto setRole(Long id, Role role, User actor) {
        User u = getEntity(id);
        preventSelfDemotion(u, actor, role);
        u.setRole(role);
        activityLog.log(actor, "a changé le rôle de " + u.getFullName() + " en " + role);
        return UserDto.from(u);
    }

    @Transactional
    public UserDto setBlocked(Long id, boolean blocked, User actor) {
        User u = getEntity(id);
        if (u.getId().equals(actor.getId())) throw ApiException.badRequest("Vous ne pouvez pas vous bloquer vous-même");
        u.setBlocked(blocked);
        activityLog.log(actor, (blocked ? "a bloqué " : "a débloqué ") + u.getFullName());
        return UserDto.from(u);
    }

    @Transactional
    public void delete(Long id, User actor) {
        User u = getEntity(id);
        if (u.getId().equals(actor.getId())) throw ApiException.badRequest("Vous ne pouvez pas supprimer votre propre compte");
        if (workspaceRepository.existsByOwnerId(id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cet utilisateur possède des workspaces : supprimez-les ou transférez-les d'abord");
        }
        taskRepository.unassignUser(id);
        taskRepository.clearCreator(id);
        commentRepository.clearUser(id);
        attachmentRepository.clearUploader(id);
        notificationRepository.deleteByUserId(id);
        resetTokenRepository.deleteByUserId(id);
        emailTokenRepository.deleteByUserId(id);
        em.createNativeQuery("delete from workspace_members where user_id = :id").setParameter("id", id).executeUpdate();
        em.createNativeQuery("delete from project_members where user_id = :id").setParameter("id", id).executeUpdate();
        storage.delete(u.getAvatarPath());
        activityLog.log(actor, "a supprimé l'utilisateur " + u.getFullName());
        repository.delete(u);
    }

    /** Invalide tous les JWT déjà émis pour cet utilisateur (voir {@link User#getTokenVersion()}). */
    private void invalidateSessions(User u) {
        u.setTokenVersion(u.getTokenVersion() + 1);
    }

    private void preventSelfDemotion(User target, User actor, Role newRole) {
        if (target.getId().equals(actor.getId()) && newRole != Role.ADMIN) {
            throw ApiException.badRequest("Vous ne pouvez pas retirer votre propre rôle administrateur");
        }
    }
}
