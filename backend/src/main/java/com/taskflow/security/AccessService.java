package com.taskflow.security;

import com.taskflow.common.ApiException;
import com.taskflow.projects.Project;
import com.taskflow.tasks.Task;
import com.taskflow.users.User;
import com.taskflow.workspace.Workspace;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Règles d'accès métier :
 * - ADMIN : tout ;
 * - propriétaire du workspace : gère le workspace et ses projets ;
 * - MANAGER membre du workspace : crée/modifie projets et tâches ;
 * - USER membre : consulte, modifie les tâches qui lui sont affectées, commente.
 */
@Service
public class AccessService {

    public boolean isWorkspaceMember(User u, Workspace w) {
        return Objects.equals(w.getOwner().getId(), u.getId())
                || w.getMembers().stream().anyMatch(m -> m.getId().equals(u.getId()));
    }

    public boolean canViewWorkspace(User u, Workspace w) {
        return CurrentUserService.isAdmin(u) || isWorkspaceMember(u, w);
    }

    public boolean canManageWorkspace(User u, Workspace w) {
        return CurrentUserService.isAdmin(u) || Objects.equals(w.getOwner().getId(), u.getId());
    }

    public boolean canViewProject(User u, Project p) {
        return canViewWorkspace(u, p.getWorkspace());
    }

    public boolean canManageProject(User u, Project p) {
        return canManageWorkspace(u, p.getWorkspace())
                || (CurrentUserService.isManagerOrAdmin(u) && isWorkspaceMember(u, p.getWorkspace()));
    }

    public boolean canEditTask(User u, Task t) {
        // L'assigné doit toujours avoir accès au projet : être retiré du workspace retire aussi ce droit.
        return canManageProject(u, t.getProject())
                || (t.getAssignee() != null && t.getAssignee().getId().equals(u.getId())
                    && canViewProject(u, t.getProject()));
    }

    public void requireViewWorkspace(User u, Workspace w) {
        if (!canViewWorkspace(u, w)) throw ApiException.forbidden();
    }

    public void requireManageWorkspace(User u, Workspace w) {
        if (!canManageWorkspace(u, w)) throw ApiException.forbidden();
    }

    public void requireViewProject(User u, Project p) {
        if (!canViewProject(u, p)) throw ApiException.forbidden();
    }

    public void requireManageProject(User u, Project p) {
        if (!canManageProject(u, p)) throw ApiException.forbidden();
    }

    public void requireEditTask(User u, Task t) {
        if (!canEditTask(u, t)) throw ApiException.forbidden();
    }
}
