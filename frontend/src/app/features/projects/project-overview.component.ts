import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ChartConfiguration } from 'chart.js';
import { STATUS_COLORS, STATUS_LABELS, TASK_STATUSES } from '../../core/constants/task.constants';
import { Store } from '@ngrx/store';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ChartComponent } from '../../shared/components/chart.component';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';
import { TasksActions } from '../../store/tasks/tasks.actions';
import { tasksFeature } from '../../store/tasks/tasks.reducer';
import { ProjectContextService } from './project-context.service';

@Component({
  selector: 'app-project-overview',
  imports: [DatePipe, MatIconModule, AvatarComponent, ChartComponent, RoleLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ctx.project(); as p) {
      <div class="layout">
        <section class="panel">
          <h2>Description</h2>
          <p class="desc">{{ p.description || 'Aucune description.' }}</p>
          <div class="facts">
            <div>
              <small class="muted">Début</small
              ><strong>{{ p.startDate ? (p.startDate | date: 'longDate') : '—' }}</strong>
            </div>
            <div>
              <small class="muted">Fin</small
              ><strong>{{ p.endDate ? (p.endDate | date: 'longDate') : '—' }}</strong>
            </div>
            <div>
              <small class="muted">Tâches</small><strong>{{ stats().total }}</strong>
            </div>
            <div>
              <small class="muted">Terminées</small><strong>{{ stats().done }}</strong>
            </div>
            <div>
              <small class="muted">En retard</small
              ><strong [class.danger]="stats().overdue > 0">{{ stats().overdue }}</strong>
            </div>
            <div>
              <small class="muted">Progression</small><strong>{{ p.progress }}%</strong>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2>Tâches par statut</h2>
          @if (chart(); as cfg) {
            <div class="chart"><app-chart [config]="cfg" /></div>
          } @else {
            <p class="muted">Aucune tâche.</p>
          }
        </section>

        <section class="panel">
          <h2>Membres</h2>
          @for (m of p.members; track m.id) {
            <div class="member">
              <app-avatar [user]="m" [size]="34" />
              <span
                ><strong>{{ m.firstname }} {{ m.lastname }}</strong
                ><br /><small class="muted">{{ m.role | roleLabel }}</small></span
              >
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }
    .layout > .panel:first-child {
      grid-row: span 2;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 17px;
    }
    .desc {
      white-space: pre-line;
      line-height: 1.6;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .facts div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px;
      border-radius: 12px;
      background: var(--tf-surface-2);
    }
    .facts strong {
      font-size: 18px;
    }
    .danger {
      color: var(--tf-danger);
    }
    .chart {
      height: 220px;
    }
    .member {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .layout > .panel:first-child {
        grid-row: auto;
      }
    }
  `,
})
export class ProjectOverviewComponent {
  protected readonly ctx = inject(ProjectContextService);
  private readonly store = inject(Store);

  private readonly byStatus = this.store.selectSignal(tasksFeature.selectTasksByStatus);
  protected readonly stats = this.store.selectSignal(tasksFeature.selectTaskStats);

  protected readonly chart = computed<ChartConfiguration<'bar'> | null>(() => {
    const cols = this.byStatus();
    if (this.stats().total === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: TASK_STATUSES.map((s) => STATUS_LABELS[s]),
        datasets: [
          {
            data: TASK_STATUSES.map((s) => cols[s].length),
            backgroundColor: TASK_STATUSES.map((s) => STATUS_COLORS[s]),
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { precision: 0 } } },
      },
    };
  });

  constructor() {
    const p = this.ctx.project();
    if (p) this.store.dispatch(TasksActions.loadTasks({ projectId: p.id }));
  }
}
