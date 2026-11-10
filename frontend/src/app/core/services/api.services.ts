import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityLog,
  AdminStats,
  AdminUserRequest,
  Attachment,
  Comment,
  Dashboard,
  MoveTaskRequest,
  Page,
  ProfileRequest,
  Project,
  ProjectRequest,
  Role,
  SearchResult,
  Task,
  TaskRequest,
  User,
  Workspace,
  WorkspaceRequest,
} from '../models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);

  list(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${API}/workspaces`);
  }
  get(id: number): Observable<Workspace> {
    return this.http.get<Workspace>(`${API}/workspaces/${id}`);
  }
  create(body: WorkspaceRequest): Observable<Workspace> {
    return this.http.post<Workspace>(`${API}/workspaces`, body);
  }
  update(id: number, body: WorkspaceRequest): Observable<Workspace> {
    return this.http.put<Workspace>(`${API}/workspaces/${id}`, body);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/workspaces/${id}`);
  }
  members(id: number): Observable<User[]> {
    return this.http.get<User[]>(`${API}/workspaces/${id}/members`);
  }
  invite(id: number, email: string): Observable<User> {
    return this.http.post<User>(`${API}/workspaces/${id}/members`, { email });
  }
  removeMember(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${API}/workspaces/${id}/members/${userId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);

  list(workspaceId?: number): Observable<Project[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    return this.http.get<Project[]>(`${API}/projects`, { params });
  }
  get(id: number): Observable<Project> {
    return this.http.get<Project>(`${API}/projects/${id}`);
  }
  create(body: ProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${API}/projects`, body);
  }
  update(id: number, body: ProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${API}/projects/${id}`, body);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/projects/${id}`);
  }
  addMember(id: number, userId: number): Observable<User> {
    return this.http.post<User>(`${API}/projects/${id}/members`, { userId });
  }
  removeMember(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${API}/projects/${id}/members/${userId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);

  listByProject(projectId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${API}/projects/${projectId}/tasks`);
  }
  mine(): Observable<Task[]> {
    return this.http.get<Task[]>(`${API}/tasks/mine`);
  }
  get(id: number): Observable<Task> {
    return this.http.get<Task>(`${API}/tasks/${id}`);
  }
  create(projectId: number, body: TaskRequest): Observable<Task> {
    return this.http.post<Task>(`${API}/projects/${projectId}/tasks`, body);
  }
  update(id: number, body: TaskRequest): Observable<Task> {
    return this.http.put<Task>(`${API}/tasks/${id}`, body);
  }
  move(id: number, body: MoveTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`${API}/tasks/${id}/move`, body);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/tasks/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);

  list(taskId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${API}/tasks/${taskId}/comments`);
  }
  create(taskId: number, content: string, parentId: number | null = null): Observable<Comment> {
    return this.http.post<Comment>(`${API}/tasks/${taskId}/comments`, { content, parentId });
  }
  update(id: number, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${API}/comments/${id}`, { content });
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/comments/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);

  listForTask(taskId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${API}/tasks/${taskId}/attachments`);
  }
  listForProject(projectId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${API}/projects/${projectId}/attachments`);
  }

  /** Upload avec suivi de progression (reportProgress + observe: 'events'). */
  upload(target: 'tasks' | 'projects', id: number, file: File): Observable<HttpEvent<Attachment>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Attachment>(`${API}/${target}/${id}/attachments`, form, {
      reportProgress: true,
      observe: 'events',
    });
  }

  download(attachment: Attachment, inline = false): Observable<Blob> {
    return this.http.get(`${API}/files/${attachment.id}`, {
      params: { inline },
      responseType: 'blob',
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/files/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  me(): Observable<User> {
    return this.http.get<User>(`${API}/users/me`);
  }
  updateProfile(body: ProfileRequest): Observable<User> {
    return this.http.put<User>(`${API}/users/me`, body);
  }
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${API}/users/me/password`, { currentPassword, newPassword });
  }
  uploadAvatar(file: File): Observable<User> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<User>(`${API}/users/me/avatar`, form);
  }
  search(q: string): Observable<User[]> {
    return this.http.get<User[]>(`${API}/users`, { params: { q } });
  }
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  users(): Observable<User[]> {
    return this.http.get<User[]>(`${API}/admin/users`);
  }
  create(body: AdminUserRequest): Observable<User> {
    return this.http.post<User>(`${API}/admin/users`, body);
  }
  update(id: number, body: AdminUserRequest): Observable<User> {
    return this.http.put<User>(`${API}/admin/users/${id}`, body);
  }
  setRole(id: number, role: Role): Observable<User> {
    return this.http.patch<User>(`${API}/admin/users/${id}/role`, { role });
  }
  setBlocked(id: number, blocked: boolean): Observable<User> {
    return this.http.patch<User>(`${API}/admin/users/${id}/block`, { blocked });
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/admin/users/${id}`);
  }
  logs(page = 0, size = 20): Observable<Page<ActivityLog>> {
    return this.http.get<Page<ActivityLog>>(`${API}/admin/logs`, { params: { page, size } });
  }
  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${API}/admin/stats`);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API}/dashboard`);
  }
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  search(q: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`${API}/search`, { params: { q } });
  }
}
