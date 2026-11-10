import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { TASK_STATUSES } from '../../core/constants/task.constants';
import { Task, TaskStatus } from '../../core/models';
import { TasksActions } from './tasks.actions';

export interface TasksState {
  projectId: number | null;
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

export const initialTasksState: TasksState = {
  projectId: null,
  tasks: [],
  loading: false,
  error: null,
};

/** Applique un déplacement Kanban localement en renumérotant les colonnes source et cible. */
export function applyMove(
  tasks: Task[],
  moved: Task,
  status: TaskStatus,
  position: number,
): Task[] {
  const others = tasks.filter((t) => t.id !== moved.id);
  const target = others.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
  const index = Math.max(0, Math.min(position, target.length));
  target.splice(index, 0, { ...moved, status });

  const positions = new Map<number, number>();
  target.forEach((t, i) => positions.set(t.id, i));
  if (moved.status !== status) {
    others
      .filter((t) => t.status === moved.status)
      .sort((a, b) => a.position - b.position)
      .forEach((t, i) => positions.set(t.id, i));
  }

  const updatedMoved = { ...moved, status, position: positions.get(moved.id)! };
  return [...others, updatedMoved].map((t) =>
    t.id === moved.id
      ? updatedMoved
      : positions.has(t.id)
        ? { ...t, position: positions.get(t.id)! }
        : t,
  );
}

function upsert(tasks: Task[], task: Task): Task[] {
  return tasks.some((t) => t.id === task.id)
    ? tasks.map((t) => (t.id === task.id ? task : t))
    : [...tasks, task];
}

export const tasksFeature = createFeature({
  name: 'tasks',
  reducer: createReducer(
    initialTasksState,
    on(TasksActions.loadTasks, (state, { projectId }) => ({
      ...state,
      projectId,
      tasks: state.projectId === projectId ? state.tasks : [],
      loading: true,
      error: null,
    })),
    on(TasksActions.loadTasksSuccess, (state, { projectId, tasks }) =>
      state.projectId === projectId ? { ...state, tasks, loading: false } : state,
    ),
    on(TasksActions.loadTasksFailure, (state, { error }) => ({ ...state, loading: false, error })),
    on(
      TasksActions.createTaskSuccess,
      TasksActions.updateTaskSuccess,
      TasksActions.upsertTask,
      (state, { task }) =>
        task.projectId === state.projectId ? { ...state, tasks: upsert(state.tasks, task) } : state,
    ),
    on(TasksActions.moveTask, (state, { task, status, position }) => ({
      ...state,
      tasks: applyMove(state.tasks, task, status, position),
    })),
    on(TasksActions.moveTaskSuccess, (state, { task }) => ({
      ...state,
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    })),
    on(TasksActions.moveTaskFailure, (state, { error }) => ({ ...state, error })),
    on(TasksActions.deleteTaskSuccess, (state, { id }) => ({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
    on(TasksActions.taskFailure, (state, { error }) => ({ ...state, error })),
    on(TasksActions.clearTasks, () => initialTasksState),
  ),
  extraSelectors: ({ selectTasks }) => {
    /** Sélecteur mémoïsé : tâches regroupées par colonne et triées par position. */
    const selectTasksByStatus = createSelector(selectTasks, (tasks) => {
      const columns = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as Task[]])) as Record<
        TaskStatus,
        Task[]
      >;
      for (const t of tasks) columns[t.status].push(t);
      for (const s of TASK_STATUSES) columns[s].sort((a, b) => a.position - b.position);
      return columns;
    });
    const selectTaskStats = createSelector(selectTasks, (tasks) => ({
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'DONE').length,
      overdue: tasks.filter((t) => t.overdue).length,
    }));
    return { selectTasksByStatus, selectTaskStats };
  },
});
