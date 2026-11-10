import { User } from './user.model';

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  blocked: boolean;
  overdue: boolean;
  assignee: User | null;
  projectId: number;
  projectName: string;
  createdBy: User | null;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRequest {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status?: TaskStatus;
  dueDate: string | null;
  assigneeId: number | null;
  blocked?: boolean;
}

export interface MoveTaskRequest {
  status: TaskStatus;
  position: number;
}
