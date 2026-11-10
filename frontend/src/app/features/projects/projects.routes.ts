import { Routes } from '@angular/router';
import { projectResolver } from './project.resolver';

export const PROJECT_ROUTES: Routes = [
  {
    path: '',
    title: 'Projets · TaskFlow',
    loadComponent: () => import('./project-list.component').then((m) => m.ProjectListComponent),
  },
  {
    path: ':id',
    title: 'Projet · TaskFlow',
    resolve: { project: projectResolver },
    loadComponent: () => import('./project-detail.component').then((m) => m.ProjectDetailComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'board' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./project-overview.component').then((m) => m.ProjectOverviewComponent),
      },
      {
        path: 'board',
        loadComponent: () =>
          import('../tasks/kanban-board.component').then((m) => m.KanbanBoardComponent),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./project-documents.component').then((m) => m.ProjectDocumentsComponent),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./project-members.component').then((m) => m.ProjectMembersComponent),
      },
    ],
  },
];
