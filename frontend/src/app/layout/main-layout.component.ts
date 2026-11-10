import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { NotificationBellComponent } from '../features/notifications/notification-bell.component';
import { GlobalSearchComponent } from '../features/search/global-search.component';
import { AvatarComponent } from '../shared/components/avatar.component';
import { RoleLabelPipe } from '../shared/pipes/labels.pipe';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
    AvatarComponent,
    GlobalSearchComponent,
    NotificationBellComponent,
    RoleLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly sidenav = viewChild.required(MatSidenav);

  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', link: '/dashboard' },
    { label: 'Espaces de travail', icon: 'workspaces', link: '/workspaces' },
    { label: 'Projets', icon: 'folder_open', link: '/projects' },
    { label: 'Mes tâches', icon: 'task_alt', link: '/my-tasks' },
    { label: 'Notifications', icon: 'notifications', link: '/notifications' },
    { label: 'Administration', icon: 'admin_panel_settings', link: '/admin', adminOnly: true },
  ];

  constructor() {
    // Ferme le menu latéral après navigation sur mobile
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.isMobile()) this.sidenav().close();
    });
  }

  ngOnInit(): void {
    this.notifications.load();
    this.notifications.connect();
  }

  ngOnDestroy(): void {
    this.notifications.disconnect();
  }

  logout(): void {
    this.notifications.disconnect();
    this.auth.logout();
  }
}
