import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ActivityLog } from '../../core/models';
import { AdminService } from '../../core/services/api.services';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-admin-logs',
  imports: [DatePipe, MatIconModule, MatPaginatorModule, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      <ul class="logs">
        @for (log of logs(); track log.id) {
          <li>
            <span class="dot"><mat-icon>history</mat-icon></span>
            <span class="text"
              ><strong>{{ log.actorName }}</strong> {{ log.action }}</span
            >
            <small class="muted" [title]="log.createdAt | date: 'medium'">{{
              log.createdAt | timeAgo
            }}</small>
          </li>
        } @empty {
          <li class="muted">Aucune action enregistrée.</li>
        }
      </ul>
      <mat-paginator
        [length]="total()"
        [pageSize]="size"
        [pageSizeOptions]="[20, 50, 100]"
        (page)="onPage($event)"
      />
    </div>
  `,
  styles: `
    .logs {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--tf-border);
    }
    .dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--tf-surface-2);
      color: var(--tf-muted);
      flex-shrink: 0;
    }
    .dot mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .text {
      flex: 1;
    }
  `,
})
export class AdminLogsComponent {
  private readonly api = inject(AdminService);
  protected readonly logs = signal<ActivityLog[]>([]);
  protected readonly total = signal(0);
  protected size = 20;

  constructor() {
    this.load(0);
  }

  onPage(e: PageEvent): void {
    this.size = e.pageSize;
    this.load(e.pageIndex);
  }

  private load(page: number): void {
    this.api.logs(page, this.size).subscribe((p) => {
      this.logs.set(p.content);
      this.total.set(p.totalElements);
    });
  }
}
