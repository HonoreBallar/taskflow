import { Task, TaskStatus } from '../../core/models';
import { TasksActions } from './tasks.actions';
import { applyMove, initialTasksState, tasksFeature } from './tasks.reducer';

function task(id: number, status: TaskStatus, position: number): Task {
  return {
    id,
    title: `T${id}`,
    description: null,
    status,
    priority: 'MEDIUM',
    dueDate: null,
    position,
    blocked: false,
    overdue: false,
    assignee: null,
    projectId: 1,
    projectName: 'P',
    createdBy: null,
    commentCount: 0,
    attachmentCount: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('tasks reducer', () => {
  const tasks = [task(1, 'TODO', 0), task(2, 'TODO', 1), task(3, 'TODO', 2), task(4, 'DONE', 0)];

  it('applyMove déplace une tâche vers une autre colonne et renumérote', () => {
    const result = applyMove(tasks, tasks[0], 'DONE', 0);
    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get(1)).toEqual(jasmine.objectContaining({ status: 'DONE', position: 0 }));
    expect(byId.get(4)!.position).toBe(1);
    expect(byId.get(2)!.position).toBe(0);
    expect(byId.get(3)!.position).toBe(1);
  });

  it('applyMove réordonne dans la même colonne', () => {
    const result = applyMove(tasks, tasks[0], 'TODO', 2);
    const order = result
      .filter((t) => t.status === 'TODO')
      .sort((a, b) => a.position - b.position)
      .map((t) => t.id);
    expect(order).toEqual([2, 3, 1]);
  });

  it('moveTask applique le déplacement de façon optimiste', () => {
    const state = { ...initialTasksState, projectId: 1, tasks };
    const next = tasksFeature.reducer(
      state,
      TasksActions.moveTask({ task: tasks[1], status: 'IN_PROGRESS', position: 0 }),
    );
    expect(next.tasks.find((t) => t.id === 2)!.status).toBe('IN_PROGRESS');
  });

  it('ignore une réponse de chargement pour un autre projet', () => {
    const state = tasksFeature.reducer(initialTasksState, TasksActions.loadTasks({ projectId: 1 }));
    const next = tasksFeature.reducer(
      state,
      TasksActions.loadTasksSuccess({ projectId: 2, tasks }),
    );
    expect(next.tasks).toEqual([]);
  });

  it('selectTasksByStatus regroupe et trie par position (sélecteur mémoïsé)', () => {
    const shuffled = [task(5, 'REVIEW', 1), task(6, 'REVIEW', 0)];
    const root = { tasks: { ...initialTasksState, tasks: shuffled } };
    const cols = tasksFeature.selectTasksByStatus(root);
    expect(cols.REVIEW.map((t) => t.id)).toEqual([6, 5]);
    expect(cols.BACKLOG).toEqual([]);
    // Même entrée => même référence (mémoïsation)
    expect(tasksFeature.selectTasksByStatus(root)).toBe(cols);
  });
});
