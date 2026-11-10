import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs';
import { Project } from '../../core/models';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { ProjectsActions } from '../../store/projects/projects.actions';
import { ProjectContextService } from './project-context.service';
import { ProjectFormDialogComponent } from './project-form-dialog.component';

@Component({
  selector: 'app-project-detail',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    DatePipe,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    AvatarComponent,
  ],
  providers: [ProjectContextService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ctx.project(); as p) {
      <div class="header">
        <div class="title">
          <a [routerLink]="['/workspaces', p.workspaceId]" class="ws">{{ p.workspaceName }}</a>
          <h1>{{ p.name }}</h1>
          <div class="meta muted">
            @if (p.startDate || p.endDate) {
              <span
                ><mat-icon inline>event</mat-icon> {{ p.startDate | date: 'd MMM' }} →
                {{ p.endDate | date: 'd MMM y' }}</span
              >
            }
            <span class="progress"
              ><mat-progress-bar mode="determinate" [value]="p.progress" /> {{ p.progress }}%</span
            >
          </div>
        </div>
        <div class="right">
          <div class="avatars">
            @for (m of p.members.slice(0, 5); track m.id) {
              <app-avatar [user]="m" [size]="30" />
            }
          </div>
          @if (ctx.canManage()) {
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions projet">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="edit(p)"><mat-icon>edit</mat-icon>Modifier</button>
              <button mat-menu-item (click)="remove(p)">
                <mat-icon>delete</mat-icon>Supprimer
              </button>
            </mat-menu>
          }
        </div>
      </div>

      <nav mat-tab-nav-bar [tabPanel]="panel" class="tabs">
        @for (tab of tabs; track tab.path) {
          <a
            mat-tab-link
            [routerLink]="tab.path"
            routerLinkActive
            #rla="routerLinkActive"
            [active]="rla.isActive"
          >
            <mat-icon>{{ tab.icon }}</mat-icon
            >&nbsp;{{ tab.label }}
          </a>
        }
      </nav>
      <mat-tab-nav-panel #panel>
        <div class="outlet"><router-outlet /></div>
      </mat-tab-nav-panel>
    }
  `,
  styles: `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .ws {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-decoration: none;
    }
    h1 {
      margin: 2px 0 6px;
      font-size: 26px;
    }
    .meta {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
      font-size: 14px;
    }
    .progress {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .progress mat-progress-bar {
      width: 140px;
    }
    .right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .avatars {
      display: flex;
    }
    .avatars app-avatar {
      margin-left: -6px;
      border: 2px solid var(--tf-bg);
      border-radius: 50%;
    }
    .tabs {
      background: transparent;
      margin-bottom: 16px;
    }
    .outlet {
      padding-top: 4px;
    }
  `,
})
export class ProjectDetailComponent {
  protected readonly ctx = inject(ProjectContextService);
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);

  /** Donnée résolue par projectResolver, liée en input. */
  readonly project = input.required<Project>();

  protected readonly tabs = [
    { path: 'board', label: 'Kanban', icon: 'view_kanban' },
    { path: 'overview', label: 'Aperçu', icon: 'info' },
    { path: 'documents', label: 'Documents', icon: 'attach_file' },
    { path: 'members', label: 'Membres', icon: 'group' },
  ];

  constructor() {
    effect(() => this.ctx.set(this.project()));
  }

  edit(project: Project): void {
    this.dialog
      .open(ProjectFormDialogComponent, { data: { project }, width: '560px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe((updated: Project) => this.ctx.set(updated));
  }

  remove(project: Project): void {
    confirmDialog(this.dialog, {
      title: 'Supprimer le projet',
      message: `Supprimer « ${project.name} » et toutes ses tâches ?`,
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.actions$
          .pipe(ofType(ProjectsActions.deleteProjectSuccess), take(1))
          .subscribe(() => this.router.navigate(['/projects']));
        this.store.dispatch(ProjectsActions.deleteProject({ id: project.id }));
      });
  }
}
