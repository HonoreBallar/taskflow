import { createActionGroup, props } from '@ngrx/store';
import { Project, ProjectRequest } from '../../core/models';

export const ProjectsActions = createActionGroup({
  source: 'Projects',
  events: {
    'Load Projects': props<{ workspaceId?: number }>(),
    'Load Projects Success': props<{ projects: Project[] }>(),
    'Load Projects Failure': props<{ error: string }>(),

    'Create Project': props<{ body: ProjectRequest }>(),
    'Create Project Success': props<{ project: Project }>(),

    'Update Project': props<{ id: number; body: ProjectRequest }>(),
    'Update Project Success': props<{ project: Project }>(),

    'Delete Project': props<{ id: number }>(),
    'Delete Project Success': props<{ id: number }>(),

    'Project Failure': props<{ error: string }>(),
  },
});
