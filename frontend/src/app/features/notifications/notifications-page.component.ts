import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { NOTIFICATION_ICONS } from './notification-icon';

@Component({
  selector: 'app-notifications-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    EmptyStateComponent,
    TimeAgoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Notifications</h1>
        <p>
          {{ service.unreadCount() }} non lue(s) ·
          <span [class.online]="service.connected()">{{
            service.connected() ? '● temps réel actif' : '○ hors ligne'
          }}</span>
        </p>
      </div>
      <div class="actions">
        <mat-button-toggle-group
          [value]="onlyUnread()"
          (change)="onlyUnread.set($event.value)"
          hideSingleSelectionIndicator
        >
          <mat-button-toggle [value]="false">Toutes</mat-button-toggle>
          <mat-button-toggle [value]="true">Non lues</mat-button-toggle>
        </mat-button-toggle-group>
        <button
          mat-stroked-button
          (click)="service.markAllRead()"
          [disabled]="!service.unreadCount()"
        >
          <mat-icon>done_all</mat-icon>Tout marquer lu
        </button>
      </div>
    </div>

    <div class="panel list">
      @for (n of visible(); track n.id) {
        <button class="item" [class.unread]="!n.read" (click)="service.open(n)">
          <span class="icon"
            ><mat-icon>{{ icons[n.type] }}</mat-icon></span
          >
          <span class="text">
            <span>{{ n.message }}</span>
            <small class="muted" [title]="n.createdAt | date: 'medium'">{{
              n.createdAt | timeAgo
            }}</small>
          </span>
          @if (!n.read) {
            <span class="dot"></span>
          }
        </button>
      } @empty {
        <app-empty-state icon="notifications_none" title="Aucune notification" />
      }
    </div>
  `,
  styles: `
    .online {
      color: #10b981;
    }
    .list {
      padding: 8px;
    }
    .item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 12px;
      border: 0;
      background: transparent;
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .item:hover {
      background: var(--tf-hover);
    }
    .item.unread {
      background: color-mix(in srgb, var(--mat-sys-primary) 7%, transparent);
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--tf-surface-2);
      color: var(--mat-sys-primary);
      flex-shrink: 0;
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--mat-sys-primary);
    }
  `,
})
export class NotificationsPageComponent {
  protected readonly service = inject(NotificationService);
  protected readonly icons = NOTIFICATION_ICONS;
  protected readonly onlyUnread = signal(false);
  protected readonly visible = computed(() =>
    this.onlyUnread() ? this.service.items().filter((n) => !n.read) : this.service.items(),
  );
}
