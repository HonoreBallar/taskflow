import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { NOTIFICATION_ICONS } from './notification-icon';

@Component({
  selector: 'app-notification-bell',
  imports: [
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TimeAgoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      aria-label="Notifications"
      [matTooltip]="
        service.connected() ? 'Notifications (temps réel)' : 'Notifications (hors ligne)'
      "
      data-cy="notification-bell"
    >
      <mat-icon
        [matBadge]="badge()"
        [matBadgeHidden]="!service.unreadCount()"
        matBadgeColor="warn"
        matBadgeSize="small"
      >
        notifications
      </mat-icon>
    </button>
    <mat-menu #menu="matMenu" xPosition="before" class="notif-menu">
      <!-- Ce clic n'est pas une action : il empêche seulement le menu de se fermer quand on clique sur l'en-tête -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div class="head" (click)="$event.stopPropagation()">
        <strong>Notifications</strong>
        @if (service.unreadCount()) {
          <button mat-button (click)="service.markAllRead()">Tout marquer lu</button>
        }
      </div>
      @for (n of recent(); track n.id) {
        <button mat-menu-item class="item" [class.unread]="!n.read" (click)="service.open(n)">
          <mat-icon>{{ icons[n.type] }}</mat-icon>
          <span class="text">
            <span class="msg">{{ n.message }}</span>
            <small class="muted">{{ n.createdAt | timeAgo }}</small>
          </span>
        </button>
      } @empty {
        <p class="empty muted">Aucune notification</p>
      }
      <a mat-menu-item routerLink="/notifications" class="all">Voir toutes les notifications</a>
    </mat-menu>
  `,
  styles: `
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 8px 8px 16px;
      min-width: 320px;
    }
    .item {
      height: auto !important;
      min-height: 56px;
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .item.unread {
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
    }
    .text {
      display: flex;
      flex-direction: column;
      white-space: normal;
      line-height: 1.35;
    }
    .msg {
      font-size: 14px;
    }
    .empty {
      padding: 16px;
      text-align: center;
      margin: 0;
    }
    .all {
      justify-content: center;
      color: var(--mat-sys-primary);
    }
  `,
})
export class NotificationBellComponent {
  protected readonly service = inject(NotificationService);
  protected readonly icons = NOTIFICATION_ICONS;
  protected readonly recent = computed(() => this.service.items().slice(0, 6));
  protected readonly badge = computed(() =>
    this.service.unreadCount() > 99 ? '99+' : this.service.unreadCount(),
  );
}
