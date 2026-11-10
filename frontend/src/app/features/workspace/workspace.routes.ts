import { Routes } from '@angular/router';

export const WORKSPACE_ROUTES: Routes = [
  {
    path: '',
    title: 'Espaces de travail · TaskFlow',
    loadComponent: () => import('./workspace-list.component').then((m) => m.WorkspaceListComponent),
  },
  {
    path: ':id',
    title: 'Espace de travail · TaskFlow',
    loadComponent: () =>
      import('./workspace-detail.component').then((m) => m.WorkspaceDetailComponent),
  },
];
