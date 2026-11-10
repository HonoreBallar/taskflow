import { User } from './user.model';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  workspaceId: number;
  workspaceName: string;
  members: User[];
  taskCount: number;
  doneCount: number;
  progress: number;
  createdAt: string;
}

export interface ProjectRequest {
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  workspaceId: number;
  memberIds?: number[];
}
