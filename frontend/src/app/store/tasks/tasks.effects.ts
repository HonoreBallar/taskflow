import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { TaskService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';
import { TasksActions } from './tasks.actions';

@Injectable()
export class TasksEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(TaskService);
  private readonly toast = inject(ToastService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.loadTasks),
      switchMap(({ projectId }) =>
        this.api.listByProject(projectId).pipe(
          map((tasks) => TasksActions.loadTasksSuccess({ projectId, tasks })),
          catchError((err) =>
            of(TasksActions.loadTasksFailure({ error: ToastService.messageOf(err) })),
          ),
        ),
      ),
    ),
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.createTask),
      concatMap(({ projectId, body }) =>
        this.api.create(projectId, body).pipe(
          map((task) => TasksActions.createTaskSuccess({ task })),
          catchError((err) => of(TasksActions.taskFailure({ error: ToastService.messageOf(err) }))),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.updateTask),
      concatMap(({ id, body }) =>
        this.api.update(id, body).pipe(
          map((task) => TasksActions.updateTaskSuccess({ task })),
          catchError((err) => of(TasksActions.taskFailure({ error: ToastService.messageOf(err) }))),
        ),
      ),
    ),
  );

  /**
   * Les déplacements sont envoyés dans l'ordre (concatMap).
   * En cas d'erreur (ex : droits insuffisants), le tableau est rechargé depuis le serveur.
   */
  move$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.moveTask),
      concatMap(({ task, status, position }) =>
        this.api.move(task.id, { status, position }).pipe(
          map((updated) => TasksActions.moveTaskSuccess({ task: updated })),
          catchError((err) =>
            of(
              TasksActions.moveTaskFailure({
                error: ToastService.messageOf(err, 'Déplacement impossible'),
              }),
              TasksActions.loadTasks({ projectId: task.projectId }),
            ),
          ),
        ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TasksActions.deleteTask),
      mergeMap(({ id }) =>
        this.api.delete(id).pipe(
          map(() => TasksActions.deleteTaskSuccess({ id })),
          catchError((err) => of(TasksActions.taskFailure({ error: ToastService.messageOf(err) }))),
        ),
      ),
    ),
  );

  notifySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TasksActions.createTaskSuccess, TasksActions.deleteTaskSuccess),
        tap((a) =>
          this.toast.success(
            a.type === TasksActions.createTaskSuccess.type ? 'Tâche créée' : 'Tâche supprimée',
          ),
        ),
      ),
    { dispatch: false },
  );

  notifyError$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          TasksActions.taskFailure,
          TasksActions.moveTaskFailure,
          TasksActions.loadTasksFailure,
        ),
        tap(({ error }) => this.toast.error(error)),
      ),
    { dispatch: false },
  );
}
