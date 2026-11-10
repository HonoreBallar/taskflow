import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Task, TaskRequest, TaskStatus } from '../../core/models';

export const TasksActions = createActionGroup({
  source: 'Tasks',
  events: {
    'Load Tasks': props<{ projectId: number }>(),
    'Load Tasks Success': props<{ projectId: number; tasks: Task[] }>(),
    'Load Tasks Failure': props<{ error: string }>(),

    'Create Task': props<{ projectId: number; body: TaskRequest }>(),
    'Create Task Success': props<{ task: Task }>(),

    'Update Task': props<{ id: number; body: TaskRequest }>(),
    'Update Task Success': props<{ task: Task }>(),

    /** Déplacement optimiste : l'état est mis à jour avant la réponse du serveur. */
    'Move Task': props<{ task: Task; status: TaskStatus; position: number }>(),
    'Move Task Success': props<{ task: Task }>(),
    'Move Task Failure': props<{ error: string }>(),

    'Delete Task': props<{ id: number }>(),
    'Delete Task Success': props<{ id: number }>(),

    'Task Failure': props<{ error: string }>(),
    'Upsert Task': props<{ task: Task }>(),
    'Clear Tasks': emptyProps(),
  },
});
