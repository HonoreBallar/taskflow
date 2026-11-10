import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { Workspace } from '../../core/models';
import { WorkspaceService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { HasRoleDirective } from '../../shared/directives/has-role.directive';
import { WorkspaceFormDialogComponent } from './workspace-form-dialog.component';

@Component({
  selector: 'app-workspace-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    AvatarComponent,
    EmptyStateComponent,
    HasRoleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Espaces de travail</h1>
        <p>Organisez vos équipes et leurs projets.</p>
      </div>
      <div class="actions" *appHasRole="['ADMIN', 'MANAGER']">
        <button mat-flat-button (click)="openForm()" data-cy="new-workspace">
          <mat-icon>add</mat-icon>Nouveau workspace
        </button>
      </div>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="cards">
      @for (ws of workspaces(); track ws.id) {
        <div class="ws-card">
          <a [routerLink]="[ws.id]" class="ws-link">
            <span class="ws-icon">{{ ws.name[0].toUpperCase() }}</span>
            <span class="ws-text">
              <strong>{{ ws.name }}</strong>
              <small class="muted">{{ ws.description || 'Aucune description' }}</small>
            </span>
          </a>
          <div class="ws-meta">
            <span><mat-icon inline>group</mat-icon> {{ ws.memberCount }} membre(s)</span>
            <span><mat-icon inline>folder</mat-icon> {{ ws.projectCount }} projet(s)</span>
            <app-avatar [user]="ws.ownerUser" [size]="26" />
          </div>
          @if (canManage(ws)) {
            <button mat-icon-button class="menu" [matMenuTriggerFor]="menu" aria-label="Actions">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="openForm(ws)">
                <mat-icon>edit</mat-icon>Modifier
              </button>
              <button mat-menu-item (click)="remove(ws)">
                <mat-icon>delete</mat-icon>Supprimer
              </button>
            </mat-menu>
          }
        </div>
      } @empty {
        @if (!loading()) {
          <app-empty-state
            icon="workspaces"
            title="Aucun espace de travail"
            message="Créez un workspace ou demandez à un manager de vous inviter."
          />
        }
      }
    </div>
  `,
  styles: `
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .ws-card {
      position: relative;
      background: var(--tf-surface);
      border: 1px solid var(--tf-border);
      border-radius: 16px;
      padding: 20px;
      transition: box-shadow 0.15s;
    }
    .ws-card:hover {
      box-shadow: 0 8px 24px rgb(15 23 42 / 8%);
    }
    .ws-link {
      display: flex;
      gap: 14px;
      align-items: center;
      color: inherit;
      text-decoration: none;
      padding-right: 32px;
    }
    .ws-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, #6366f1, #0ea5e9);
      flex-shrink: 0;
    }
    .ws-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .ws-text small {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ws-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--tf-muted);
    }
    .ws-meta app-avatar {
      margin-left: auto;
    }
    .menu {
      position: absolute;
      top: 12px;
      right: 8px;
    }
  `,
})
export class WorkspaceListComponent {
  private readonly api = inject(WorkspaceService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.list().subscribe({
      next: (list) => {
        this.workspaces.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canManage(ws: Workspace): boolean {
    return this.auth.isAdmin() || ws.owner === this.auth.currentUser()?.id;
  }

  openForm(ws?: Workspace): void {
    this.dialog
      .open(WorkspaceFormDialogComponent, { data: ws ?? null, width: '480px' })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.reload());
  }

  remove(ws: Workspace): void {
    confirmDialog(this.dialog, {
      title: 'Supprimer le workspace',
      message: `Supprimer « ${ws.name} » ainsi que tous ses projets et tâches ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(ws.id)),
      )
      .subscribe({
        next: () => {
          this.toast.success('Workspace supprimé');
          this.workspaces.update((l) => l.filter((w) => w.id !== ws.id));
        },
        error: (err) => this.toast.error(ToastService.messageOf(err)),
      });
  }
}
