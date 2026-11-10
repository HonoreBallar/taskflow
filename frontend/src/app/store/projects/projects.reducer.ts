import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { Project } from '../../core/models';
import { ProjectsActions } from './projects.actions';

export interface ProjectsState {
  projects: Project[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ProjectsState = { projects: [], loading: false, saving: false, error: null };

export const projectsFeature = createFeature({
  name: 'projects',
  reducer: createReducer(
    initialState,
    on(ProjectsActions.loadProjects, (s) => ({ ...s, loading: true, error: null })),
    on(ProjectsActions.loadProjectsSuccess, (s, { projects }) => ({
      ...s,
      projects,
      loading: false,
    })),
    on(ProjectsActions.loadProjectsFailure, (s, { error }) => ({ ...s, loading: false, error })),
    on(ProjectsActions.createProject, ProjectsActions.updateProject, (s) => ({
      ...s,
      saving: true,
    })),
    on(ProjectsActions.createProjectSuccess, (s, { project }) => ({
      ...s,
      saving: false,
      projects: [project, ...s.projects],
    })),
    on(ProjectsActions.updateProjectSuccess, (s, { project }) => ({
      ...s,
      saving: false,
      projects: s.projects.map((p) => (p.id === project.id ? project : p)),
    })),
    on(ProjectsActions.deleteProjectSuccess, (s, { id }) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
    })),
    on(ProjectsActions.projectFailure, (s, { error }) => ({ ...s, saving: false, error })),
  ),
  extraSelectors: ({ selectProjects }) => ({
    selectAverageProgress: createSelector(selectProjects, (projects) =>
      projects.length
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
        : 0,
    ),
  }),
});

/** Sélecteur paramétré (factory) mémoïsé par identifiant. */
export const selectProjectById = (id: number) =>
  createSelector(
    projectsFeature.selectProjects,
    (projects) => projects.find((p) => p.id === id) ?? null,
  );
