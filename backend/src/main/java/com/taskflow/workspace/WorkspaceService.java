package com.taskflow.workspace;

import com.taskflow.admin.ActivityLogService;
import com.taskflow.common.ApiException;
import com.taskflow.notifications.NotificationService;
import com.taskflow.notifications.NotificationType;
import com.taskflow.security.AccessService;
import com.taskflow.security.CurrentUserService;
import com.taskflow.tasks.TaskRepository;
import com.taskflow.users.User;
import com.taskflow.users.UserDto;
import com.taskflow.users.UserRepository;
import com.taskflow.workspace.WorkspaceDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository repository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final AccessService access;
    private final NotificationService notifications;
    private final ActivityLogService activityLog;

    public Workspace getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Workspace"));
    }

    @Transactional(readOnly = true)
    public List<WorkspaceDto> list(User user) {
        List<Workspace> list = CurrentUserService.isAdmin(user)
                ? repository.findAllByOrderByNameAsc()
                : repository.findAccessible(user.getId());
        return list.stream().map(WorkspaceDto::from).toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceDto get(User user, Long id) {
        Workspace w = getEntity(id);
        access.requireViewWorkspace(user, w);
        return WorkspaceDto.from(w);
    }

    @Transactional
    public WorkspaceDto create(User user, WorkspaceRequest req) {
        CurrentUserService.requireManager(user);
        Workspace w = repository.save(Workspace.builder()
                .name(req.name().trim()).description(req.description()).owner(user).build());
        activityLog.log(user, "a créé le workspace " + w.getName());
        return WorkspaceDto.from(w);
    }

    @Transactional
    public WorkspaceDto update(User user, Long id, WorkspaceRequest req) {
        Workspace w = getEntity(id);
        access.requireManageWorkspace(user, w);
        w.setName(req.name().trim());
        w.setDescription(req.description());
        return WorkspaceDto.from(w);
    }

    @Transactional
    public void delete(User user, Long id) {
        Workspace w = getEntity(id);
        access.requireManageWorkspace(user, w);
        activityLog.log(user, "a supprimé le workspace " + w.getName());
        repository.delete(w);
    }

    @Transactional(readOnly = true)
    public List<UserDto> members(User user, Long id) {
        Workspace w = getEntity(id);
        access.requireViewWorkspace(user, w);
        List<UserDto> result = new ArrayList<>();
        result.add(UserDto.from(w.getOwner()));
        w.getMembers().forEach(m -> result.add(UserDto.from(m)));
        return result;
    }

    @Transactional
    public UserDto invite(User user, Long id, InviteRequest req) {
        Workspace w = getEntity(id);
        if (!access.canManageWorkspace(user, w)
                && !(CurrentUserService.isManagerOrAdmin(user) && access.isWorkspaceMember(user, w))) {
            throw ApiException.forbidden();
        }
        User invited = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Aucun utilisateur avec cet email"));
        if (access.isWorkspaceMember(invited, w)) {
            throw new ApiException(HttpStatus.CONFLICT, "Cet utilisateur est déjà membre");
        }
        w.getMembers().add(invited);
        notifications.notify(invited, user, NotificationType.WORKSPACE_INVITATION,
                user.getFullName() + " vous a ajouté au workspace « " + w.getName() + " »",
                "/workspaces/" + w.getId());
        activityLog.log(user, "a invité " + invited.getFullName() + " dans le workspace " + w.getName());
        return UserDto.from(invited);
    }

    @Transactional
    public void removeMember(User user, Long id, Long userId) {
        Workspace w = getEntity(id);
        boolean self = user.getId().equals(userId);
        if (!self) access.requireManageWorkspace(user, w);
        if (w.getOwner().getId().equals(userId)) {
            throw ApiException.badRequest("Le propriétaire ne peut pas être retiré");
        }
        w.getMembers().removeIf(m -> m.getId().equals(userId));
        w.getProjects().forEach(p -> p.getMembers().removeIf(m -> m.getId().equals(userId)));
        // Un ancien membre ne garde aucune tâche affectée dans ce workspace
        taskRepository.unassignUserInWorkspace(userId, w.getId());
    }
}
