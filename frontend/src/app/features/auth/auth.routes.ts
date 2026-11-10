import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Connexion · TaskFlow',
    loadComponent: () => import('./login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Inscription · TaskFlow',
    loadComponent: () => import('./register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    title: 'Mot de passe oublié · TaskFlow',
    loadComponent: () =>
      import('./forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Nouveau mot de passe · TaskFlow',
    loadComponent: () => import('./reset-password.component').then((m) => m.ResetPasswordComponent),
  },
];
