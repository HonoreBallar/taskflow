import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs';
import { STATUS_LABELS, TASK_STATUSES } from '../../core/constants/task.constants';
import { Task, TaskStatus, User } from '../../core/models';
import { TaskService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { FullNamePipe, PriorityLabelPipe, StatusLabelPipe } from '../../shared/pipes/labels.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TasksActions } from '../../store/tasks/tasks.actions';
import { tasksFeature } from '../../store/tasks/tasks.reducer';
import { CommentThreadComponent } from '../comments/comment-thread.component';
import { AttachmentPanelComponent } from '../files/attachment-panel.component';
import { TaskFormDialogComponent, TaskFormData } from './task-form-dialog.component';

export interface TaskDetailData {
  taskId: number;
  members: User[];
}

@Component({
  selector: 'app-task-detail-dialog',
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
    AvatarComponent,
    StatusLabelPipe,
    PriorityLabelPipe,
    FullNamePipe,
    TimeAgoPipe,
    CommentThreadComponent,
    AttachmentPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-detail-dialog.component.html',
  styleUrl: './task-detail-dialog.component.scss',
})
export class TaskDetailDialogComponent {
  protected readonly data = inject<TaskDetailData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TaskDetailDialogComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly auth = inject(AuthService);
  private readonly taskApi = inject(TaskService);

  protected readonly statuses = TASK_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  private readonly tasks = this.store.selectSignal(tasksFeature.selectTasks);
  /** La tâche est lue depuis le store : toute mise à jour (drag & drop, édition) se reflète ici. */
  protected readonly task = computed(
    () => this.tasks().find((t) => t.id === this.data.taskId) ?? null,
  );

  protected readonly canManage = computed(() => this.auth.isManager());
  protected readonly canEdit = computed(() => {
    const t = this.task();
    return this.canManage() || (!!t && t.assignee?.id === this.auth.currentUser()?.id);
  });

  constructor() {
    // Si la tâche n'est pas dans le store (lien direct), on la charge depuis l'API
    if (!this.task()) {
      this.taskApi.get(this.data.taskId).subscribe({
        next: (task) => this.store.dispatch(TasksActions.upsertTask({ task })),
        error: () => this.ref.close(),
      });
    }
  }

  changeStatus(task: Task, status: TaskStatus): void {
    if (status === task.status) return;
    const position = this.tasks().filter((t) => t.status === status).length;
    this.store.dispatch(TasksActions.moveTask({ task, status, position }));
  }

  toggleBlocked(task: Task): void {
    this.store.dispatch(
      TasksActions.updateTask({
        id: task.id,
        body: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
          assigneeId: task.assignee?.id ?? null,
          blocked: !task.blocked,
        },
      }),
    );
  }

  edit(task: Task): void {
    const data: TaskFormData = {
      projectId: task.projectId,
      members: this.data.members,
      task,
      canAssign: this.canManage(),
    };
    this.dialog.open(TaskFormDialogComponent, { data, width: '600px', maxWidth: '95vw' });
  }

  remove(task: Task): void {
    confirmDialog(this.dialog, {
      title: 'Supprimer la tâche',
      message: `Supprimer « ${task.title} » ?`,
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.store.dispatch(TasksActions.deleteTask({ id: task.id }));
        this.ref.close();
      });
  }

  /** Les compteurs de la carte sont rafraîchis après ajout de commentaire / pièce jointe. */
  refreshTask(): void {
    this.taskApi
      .get(this.data.taskId)
      .subscribe((task) => this.store.dispatch(TasksActions.upsertTask({ task })));
  }
}
