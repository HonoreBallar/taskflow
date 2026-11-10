import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../core/constants/task.constants';
import { Task, TaskPriority, TaskStatus } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { TasksActions } from '../../store/tasks/tasks.actions';
import { tasksFeature } from '../../store/tasks/tasks.reducer';
import { ProjectContextService } from '../projects/project-context.service';
import { TaskCardComponent } from './task-card.component';
import { TaskDetailDialogComponent, TaskDetailData } from './task-detail-dialog.component';
import { TaskFormDialogComponent, TaskFormData } from './task-form-dialog.component';

@Component({
  selector: 'app-kanban-board',
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressBarModule,
    TaskCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly ctx = inject(ProjectContextService);

  /** ?task=12 : ouvre directement le détail (liens des notifications) */
  readonly task = input<string>();

  protected readonly statuses = TASK_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusColors = STATUS_COLORS;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly loading = this.store.selectSignal(tasksFeature.selectLoading);
  private readonly columns = this.store.selectSignal(tasksFeature.selectTasksByStatus);
  private readonly allTasks = this.store.selectSignal(tasksFeature.selectTasks);

  // Filtres locaux
  protected readonly search = signal('');
  protected readonly priorityFilter = signal<TaskPriority | null>(null);
  protected readonly assigneeFilter = signal<number | 'me' | null>(null);

  protected readonly hasFilter = computed(
    () => !!this.search() || !!this.priorityFilter() || !!this.assigneeFilter(),
  );

  protected readonly filteredColumns = computed(() => {
    const cols = this.columns();
    if (!this.hasFilter()) return cols;
    const q = this.search().trim().toLowerCase();
    const prio = this.priorityFilter();
    const who =
      this.assigneeFilter() === 'me' ? this.auth.currentUser()?.id : this.assigneeFilter();
    const keep = (t: Task) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (!prio || t.priority === prio) &&
      (!who || t.assignee?.id === who);
    return Object.fromEntries(TASK_STATUSES.map((s) => [s, cols[s].filter(keep)])) as Record<
      TaskStatus,
      Task[]
    >;
  });

  private openedFromUrl: number | null = null;

  constructor() {
    effect(() => {
      const p = this.ctx.project();
      if (p) untracked(() => this.store.dispatch(TasksActions.loadTasks({ projectId: p.id })));
    });

    // Ouvre la tâche passée en query param une fois les tâches chargées
    effect(() => {
      const id = Number(this.task());
      const tasks = this.allTasks();
      if (!id || this.loading() || id === this.openedFromUrl) return;
      const t = tasks.find((x) => x.id === id);
      if (t) {
        this.openedFromUrl = id;
        untracked(() => this.openDetail(t));
      }
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(TasksActions.clearTasks());
  }

  /** Glisser-déposer : déplacement dans la colonne ou vers une autre colonne. */
  drop(event: CdkDragDrop<TaskStatus, TaskStatus, Task>): void {
    const task = event.item.data;
    const target = event.container.data;
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex)
      return;

    // Avec un filtre actif, l'index affiché ne correspond pas à l'index réel : on recalcule.
    let position = event.currentIndex;
    if (this.hasFilter()) {
      const visible = this.filteredColumns()[target].filter((t) => t.id !== task.id);
      const anchor = visible[event.currentIndex];
      const real = this.columns()[target].filter((t) => t.id !== task.id);
      position = anchor ? real.findIndex((t) => t.id === anchor.id) : real.length;
    }
    this.store.dispatch(TasksActions.moveTask({ task, status: target, position }));
  }

  /** trackBy utilisé par @for (track) pour éviter de recréer les cartes. */
  protected trackTask(_: number, t: Task): number {
    return t.id;
  }

  newTask(status: TaskStatus = 'TODO'): void {
    const p = this.ctx.project();
    if (!p) return;
    const data: TaskFormData = { projectId: p.id, members: p.members, status, canAssign: true };
    this.dialog.open(TaskFormDialogComponent, { data, width: '600px', maxWidth: '95vw' });
  }

  openDetail(task: Task): void {
    const p = this.ctx.project();
    if (!p) return;
    const data: TaskDetailData = { taskId: task.id, members: p.members };
    this.dialog
      .open(TaskDetailDialogComponent, {
        data,
        width: '900px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe(() => {
        if (this.task()) this.router.navigate([], { queryParams: {}, replaceUrl: true });
        this.openedFromUrl = null;
      });
  }

  clearFilters(): void {
    this.search.set('');
    this.priorityFilter.set(null);
    this.assigneeFilter.set(null);
  }
}
