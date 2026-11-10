import { TaskStatus } from './task.model';
import { User } from './user.model';

export interface Comment {
  id: number;
  content: string;
  author: User | null;
  taskId: number;
  parentId: number | null;
  createdAt: string;
  updatedAt: string | null;
}

/** Commentaire enrichi de ses réponses pour l'affichage en fil de discussion. */
export interface CommentNode extends Comment {
  replies: CommentNode[];
}

export type NotificationType =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'COMMENT_ADDED'
  | 'MENTION'
  | 'WORKSPACE_INVITATION'
  | 'PROJECT_INVITATION';

export interface AppNotification {
  id: number;
  message: string;
  type: NotificationType;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Attachment {
  id: number;
  name: string;
  contentType: string;
  size: number;
  taskId: number | null;
  projectId: number | null;
  uploadedBy: User | null;
  url: string;
  previewable: boolean;
  createdAt: string;
}

export interface ProjectProgress {
  id: number;
  name: string;
  progress: number;
  taskCount: number;
  doneCount: number;
}

export interface Dashboard {
  projectCount: number;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
  inProgressCount: number;
  blockedCount: number;
  tasksByStatus: Record<TaskStatus, number>;
  projects: ProjectProgress[];
}

export interface SearchResult {
  projects: { id: number; name: string; workspaceName: string }[];
  tasks: {
    id: number;
    title: string;
    projectId: number;
    projectName: string;
    status: TaskStatus;
  }[];
  users: User[];
}

export interface ActivityLog {
  id: number;
  actorId: number | null;
  actorName: string;
  action: string;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminStats {
  users: number;
  admins: number;
  managers: number;
  collaborators: number;
  workspaces: number;
  projects: number;
  tasks: number;
  doneTasks: number;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string> | null;
}
