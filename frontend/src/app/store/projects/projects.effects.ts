import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { ProjectService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';
import { ProjectsActions } from './projects.actions';

@Injectable()
export class ProjectsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ProjectService);
  private readonly toast = inject(ToastService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.loadProjects),
      switchMap(({ workspaceId }) =>
        this.api.list(workspaceId).pipe(
          map((projects) => ProjectsActions.loadProjectsSuccess({ projects })),
          catchError((err) =>
            of(ProjectsActions.loadProjectsFailure({ error: ToastService.messageOf(err) })),
          ),
        ),
      ),
    ),
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.createProject),
      concatMap(({ body }) =>
        this.api.create(body).pipe(
          map((project) => ProjectsActions.createProjectSuccess({ project })),
          catchError((err) =>
            of(ProjectsActions.projectFailure({ error: ToastService.messageOf(err) })),
          ),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.updateProject),
      concatMap(({ id, body }) =>
        this.api.update(id, body).pipe(
          map((project) => ProjectsActions.updateProjectSuccess({ project })),
          catchError((err) =>
            of(ProjectsActions.projectFailure({ error: ToastService.messageOf(err) })),
          ),
        ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.deleteProject),
      mergeMap(({ id }) =>
        this.api.delete(id).pipe(
          map(() => ProjectsActions.deleteProjectSuccess({ id })),
          catchError((err) =>
            of(ProjectsActions.projectFailure({ error: ToastService.messageOf(err) })),
          ),
        ),
      ),
    ),
  );

  feedback$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          ProjectsActions.createProjectSuccess,
          ProjectsActions.updateProjectSuccess,
          ProjectsActions.deleteProjectSuccess,
          ProjectsActions.projectFailure,
        ),
        tap((a) => {
          switch (a.type) {
            case ProjectsActions.createProjectSuccess.type:
              return this.toast.success('Projet créé');
            case ProjectsActions.updateProjectSuccess.type:
              return this.toast.success('Projet mis à jour');
            case ProjectsActions.deleteProjectSuccess.type:
              return this.toast.success('Projet supprimé');
            default:
              return this.toast.error((a as { error: string }).error);
          }
        }),
      ),
    { dispatch: false },
  );
}
