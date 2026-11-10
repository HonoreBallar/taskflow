import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../core/constants/task.constants';
import { Task, TaskPriority, TaskRequest, TaskStatus, User } from '../../core/models';
import { TasksActions } from '../../store/tasks/tasks.actions';
import { fromIsoDate, toIsoDate } from '../../shared/utils/validators';

export interface TaskFormData {
  projectId: number;
  members: User[];
  task?: Task;
  status?: TaskStatus;
  /** Un collaborateur ne peut pas réaffecter la tâche */
  canAssign: boolean;
}

@Component({
  selector: 'app-task-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.task ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-col">
        <mat-form-field>
          <mat-label>Titre</mat-label>
          <input matInput formControlName="title" data-cy="task-title" />
          @if (form.controls.title.invalid) {
            <mat-error>Titre obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="4"
            data-cy="task-description"
          ></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Priorité</mat-label>
            <mat-select formControlName="priority" data-cy="task-priority">
              @for (p of priorities; track p) {
                <mat-option [value]="p">{{ priorityLabels[p] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Statut</mat-label>
            <mat-select formControlName="status">
              @for (s of statuses; track s) {
                <mat-option [value]="s">{{ statusLabels[s] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Date limite</mat-label>
            <input matInput [matDatepicker]="due" formControlName="dueDate" />
            <mat-datepicker-toggle matIconSuffix [for]="due" />
            <mat-datepicker #due />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Responsable</mat-label>
            <mat-select formControlName="assigneeId" data-cy="task-assignee">
              <mat-option [value]="null">Non affectée</mat-option>
              @for (m of data.members; track m.id) {
                <mat-option [value]="m.id">{{ m.firstname }} {{ m.lastname }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-slide-toggle formControlName="blocked">Tâche bloquée</mat-slide-toggle>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button type="submit" [disabled]="saving()" data-cy="task-save">
          Enregistrer
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class TaskFormDialogComponent {
  protected readonly data = inject<TaskFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TaskFormDialogComponent, Task>);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);

  protected readonly priorities = TASK_PRIORITIES;
  protected readonly statuses = TASK_STATUSES;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly saving = signal(false);

  private readonly t = this.data.task;

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: [this.t?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.t?.description ?? ''],
    priority: [this.t?.priority ?? ('MEDIUM' as TaskPriority)],
    status: [this.t?.status ?? this.data.status ?? ('TODO' as TaskStatus)],
    dueDate: [fromIsoDate(this.t?.dueDate) as Date | null],
    assigneeId: [this.t?.assignee?.id ?? (null as number | null)],
    blocked: [this.t?.blocked ?? false],
  });

  constructor() {
    if (!this.data.canAssign) this.form.controls.assigneeId.disable();
  }

  save(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    const body: TaskRequest = {
      title: v.title.trim(),
      description: v.description || null,
      priority: v.priority,
      status: v.status,
      dueDate: toIsoDate(v.dueDate),
      assigneeId: v.assigneeId,
      blocked: v.blocked,
    };
    this.saving.set(true);

    this.actions$
      .pipe(
        ofType(
          TasksActions.createTaskSuccess,
          TasksActions.updateTaskSuccess,
          TasksActions.taskFailure,
        ),
        take(1),
      )
      .subscribe((action) => {
        if (action.type === TasksActions.taskFailure.type) this.saving.set(false);
        else this.ref.close(action.task);
      });

    this.store.dispatch(
      this.t
        ? TasksActions.updateTask({ id: this.t.id, body })
        : TasksActions.createTask({ projectId: this.data.projectId, body }),
    );
  }
}
