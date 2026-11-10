export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  blocked: boolean;
  createdAt: string;
}

/** Le JWT n'est pas dans la réponse : il est posé par le serveur dans un cookie HttpOnly. */
export interface AuthResponse {
  expiresIn: number;
  user: User;
}

/** `verificationRequired` : le compte est créé mais l'adresse email doit être confirmée avant la connexion. */
export interface RegisterResponse {
  verificationRequired: boolean;
  expiresIn: number | null;
  user: User | null;
}

export interface VerifyEmailResponse {
  emailChanged: boolean;
  message: string;
}

export interface ProfileRequest {
  firstname: string;
  lastname: string;
  email: string;
  /** Requis uniquement pour changer d'adresse email */
  currentPassword?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export interface AdminUserRequest {
  firstname: string;
  lastname: string;
  email: string;
  password?: string | null;
  role: Role;
}
