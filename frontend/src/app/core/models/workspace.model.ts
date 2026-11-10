import { User } from './user.model';

export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  ownerUser: User;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface WorkspaceRequest {
  name: string;
  description: string | null;
}
