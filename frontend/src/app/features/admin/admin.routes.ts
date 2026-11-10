import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        title: 'Utilisateurs · Administration',
        loadComponent: () => import('./admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'logs',
        title: "Journal d'activité · Administration",
        loadComponent: () => import('./admin-logs.component').then((m) => m.AdminLogsComponent),
      },
    ],
  },
];
