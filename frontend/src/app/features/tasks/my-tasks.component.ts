import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Task } from '../../core/models';
import { TaskService } from '../../core/services/api.services';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PriorityLabelPipe, StatusLabelPipe } from '../../shared/pipes/labels.pipe';

type Filter = 'open' | 'overdue' | 'done' | 'all';

@Component({
  selector: 'app-my-tasks',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    EmptyStateComponent,
    StatusLabelPipe,
    PriorityLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Mes tâches</h1>
        <p>Les tâches qui vous sont affectées, tous projets confondus.</p>
      </div>
      <mat-button-toggle-group
        [value]="filter()"
        (change)="filter.set($event.value)"
        hideSingleSelectionIndicator
      >
        <mat-button-toggle value="open">À faire ({{ counts().open }})</mat-button-toggle>
        <mat-button-toggle value="overdue">En retard ({{ counts().overdue }})</mat-button-toggle>
        <mat-button-toggle value="done">Terminées ({{ counts().done }})</mat-button-toggle>
        <mat-button-toggle value="all">Toutes</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    @if (tasks() === undefined) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="panel list">
      @for (t of visible(); track t.id) {
        <a
          class="row"
          [routerLink]="['/projects', t.projectId, 'board']"
          [queryParams]="{ task: t.id }"
        >
          <span class="chip status-{{ t.status }}">{{ t.status | statusLabel }}</span>
          <span class="title">
            <strong>{{ t.title }}</strong>
            <small class="muted">{{ t.projectName }}</small>
          </span>
          <span class="chip priority-{{ t.priority }}">{{ t.priority | priorityLabel }}</span>
          <span class="due" [class.overdue]="t.overdue">
            @if (t.dueDate) {
              <mat-icon inline>event</mat-icon> {{ t.dueDate | date: 'd MMM y' }}
            }
          </span>
        </a>
      } @empty {
        <app-empty-state
          icon="task_alt"
          title="Aucune tâche"
          message="Rien dans cette catégorie."
        />
      }
    </div>
  `,
  styles: `
    .list {
      padding: 8px;
    }
    .row {
      display: grid;
      grid-template-columns: 110px 1fr auto 120px;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border-radius: 10px;
      color: inherit;
      text-decoration: none;
    }
    .row:hover {
      background: var(--tf-hover);
    }
    .title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .title strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .due {
      text-align: right;
      font-size: 13px;
      color: var(--tf-muted);
    }
    .due.overdue {
      color: var(--tf-danger);
      font-weight: 600;
    }
    @media (max-width: 640px) {
      .row {
        grid-template-columns: 1fr auto;
      }
      .row > .chip:first-child,
      .due {
        display: none;
      }
    }
  `,
})
export class MyTasksComponent {
  protected readonly tasks = toSignal(
    inject(TaskService)
      .mine()
      .pipe(map((t) => t as Task[] | undefined)),
  );
  protected readonly filter = signal<Filter>('open');

  protected readonly counts = computed(() => {
    const list = this.tasks() ?? [];
    return {
      open: list.filter((t) => t.status !== 'DONE').length,
      overdue: list.filter((t) => t.overdue).length,
      done: list.filter((t) => t.status === 'DONE').length,
    };
  });

  protected readonly visible = computed(() => {
    const list = this.tasks() ?? [];
    switch (this.filter()) {
      case 'open':
        return list.filter((t) => t.status !== 'DONE');
      case 'overdue':
        return list.filter((t) => t.overdue);
      case 'done':
        return list.filter((t) => t.status === 'DONE');
      default:
        return list;
    }
  });
}
