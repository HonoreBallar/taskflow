import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { catchError, of } from 'rxjs';
import { Dashboard } from '../../core/models';
import { DashboardService, TaskService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ChartComponent } from '../../shared/components/chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { PriorityLabelPipe, StatusLabelPipe } from '../../shared/pipes/labels.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    StatCardComponent,
    ChartComponent,
    EmptyStateComponent,
    StatusLabelPipe,
    PriorityLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Données converties en Signals depuis les Observables HTTP (toSignal). */
  protected readonly data = toSignal(
    inject(DashboardService)
      .get()
      .pipe(catchError(() => of(null))),
    {
      initialValue: undefined,
    },
  );
  protected readonly myTasks = toSignal(
    inject(TaskService)
      .mine()
      .pipe(catchError(() => of([]))),
    {
      initialValue: [],
    },
  );

  protected readonly upcoming = computed(() =>
    this.myTasks()
      .filter((t) => t.status !== 'DONE')
      .slice(0, 6),
  );

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 18 ? 'Bonjour' : 'Bonsoir';
  });

  protected readonly statusChart = computed<ChartConfiguration<'doughnut'> | null>(() => {
    const d = this.data();
    if (!d || d.taskCount === 0) return null;
    const s = d.tasksByStatus;
    return {
      type: 'doughnut',
      data: {
        labels: ['Terminé', 'En cours', 'Bloqué', 'À faire'],
        datasets: [
          {
            data: [
              s.DONE,
              Math.max(0, d.inProgressCount - this.blockedInProgress(d)),
              d.blockedCount,
              s.BACKLOG + s.TODO,
            ],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'],
            borderWidth: 0,
          },
        ],
      },
      options: { cutout: '68%', plugins: { legend: { position: 'bottom' } } },
    };
  });

  protected readonly projectChart = computed<ChartConfiguration<'bar'> | null>(() => {
    const d = this.data();
    if (!d || d.projects.length === 0) return null;
    const projects = d.projects.slice(0, 10);
    return {
      type: 'bar',
      data: {
        labels: projects.map((p) => p.name),
        datasets: [
          {
            label: 'Progression (%)',
            data: projects.map((p) => p.progress),
            backgroundColor: '#8b5cf6',
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        scales: { x: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
        plugins: { legend: { display: false } },
      },
    };
  });

  /** Les tâches bloquées sont comptées à part pour ne pas les compter deux fois dans « En cours ». */
  private blockedInProgress(d: Dashboard): number {
    return Math.min(d.blockedCount, d.inProgressCount);
  }

  goTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
