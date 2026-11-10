import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { filter, forkJoin, switchMap } from 'rxjs';
import { Project, User, Workspace } from '../../core/models';
import { ProjectService, WorkspaceService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';
import { ProjectCardComponent } from '../projects/project-card.component';

@Component({
  selector: 'app-workspace-detail',
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    AvatarComponent,
    EmptyStateComponent,
    ProjectCardComponent,
    RoleLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (workspace(); as ws) {
      <div class="page-header">
        <div>
          <a routerLink="/workspaces" class="back"
            ><mat-icon inline>arrow_back</mat-icon> Espaces de travail</a
          >
          <h1>{{ ws.name }}</h1>
          <p>{{ ws.description }}</p>
        </div>
        @if (canInvite()) {
          <div class="actions">
            <a mat-flat-button routerLink="/projects" [queryParams]="{ new: 1, workspace: ws.id }"
              ><mat-icon>add</mat-icon>Nouveau projet</a
            >
          </div>
        }
      </div>

      <mat-tab-group animationDuration="150ms">
        <mat-tab [label]="'Projets (' + projects().length + ')'">
          <div class="cards">
            @for (p of projects(); track p.id) {
              <app-project-card [project]="p" />
            } @empty {
              <app-empty-state icon="folder_open" title="Aucun projet dans ce workspace" />
            }
          </div>
        </mat-tab>

        <mat-tab [label]="'Membres (' + members().length + ')'">
          <div class="members panel">
            @if (canInvite()) {
              <form class="invite" (ngSubmit)="invite()">
                <mat-form-field class="grow">
                  <mat-label>Inviter par email</mat-label>
                  <input
                    matInput
                    type="email"
                    [formControl]="inviteEmail"
                    placeholder="collegue@entreprise.com"
                    data-cy="invite-email"
                  />
                  <mat-icon matPrefix>person_add</mat-icon>
                </mat-form-field>
                <button mat-flat-button type="submit" [disabled]="inviteEmail.invalid">
                  Inviter
                </button>
              </form>
            }
            @for (m of members(); track m.id) {
              <div class="member">
                <app-avatar [user]="m" [size]="40" />
                <div class="member-text">
                  <strong>{{ m.firstname }} {{ m.lastname }}</strong>
                  <small class="muted">{{ m.email }}</small>
                </div>
                <span class="chip role">{{
                  m.id === ws.owner ? 'Propriétaire' : (m.role | roleLabel)
                }}</span>
                @if (canManage() && m.id !== ws.owner) {
                  <button
                    mat-icon-button
                    (click)="removeMember(m)"
                    matTooltip="Retirer du workspace"
                  >
                    <mat-icon>person_remove</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    } @else {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      text-decoration: none;
      margin-bottom: 4px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      padding: 16px 0;
    }
    .members {
      margin-top: 16px;
    }
    .invite {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .grow {
      flex: 1 1 260px;
    }
    .member {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--tf-border);
    }
    .member:last-child {
      border-bottom: none;
    }
    .member-text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .role {
      background: var(--tf-surface-2);
      color: var(--tf-muted);
    }
  `,
})
export class WorkspaceDetailComponent {
  private readonly api = inject(WorkspaceService);
  private readonly projectApi = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Paramètre de route :id lié en input (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly workspace = signal<Workspace | null>(null);
  protected readonly members = signal<User[]>([]);
  protected readonly projects = signal<Project[]>([]);
  protected readonly inviteEmail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly canManage = computed(() => {
    const ws = this.workspace();
    return !!ws && (this.auth.isAdmin() || ws.owner === this.auth.currentUser()?.id);
  });
  protected readonly canInvite = computed(() => this.canManage() || this.auth.isManager());

  constructor() {
    effect(() => this.load(+this.id()));
  }

  private load(id: number): void {
    forkJoin({
      ws: this.api.get(id),
      members: this.api.members(id),
      projects: this.projectApi.list(id),
    }).subscribe({
      next: ({ ws, members, projects }) => {
        this.workspace.set(ws);
        this.members.set(members);
        this.projects.set(projects);
      },
      error: (err) => {
        this.toast.error(ToastService.messageOf(err, 'Workspace introuvable'));
        this.router.navigate(['/workspaces']);
      },
    });
  }

  invite(): void {
    const ws = this.workspace();
    if (!ws || this.inviteEmail.invalid) return;
    this.api.invite(ws.id, this.inviteEmail.value.trim()).subscribe({
      next: (user) => {
        this.members.update((l) => [...l, user]);
        this.inviteEmail.reset();
        this.toast.success(`${user.firstname} a été ajouté au workspace`);
      },
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  removeMember(user: User): void {
    const ws = this.workspace()!;
    confirmDialog(this.dialog, {
      title: 'Retirer le membre',
      message: `Retirer ${user.firstname} ${user.lastname} du workspace ?`,
      confirmText: 'Retirer',
      danger: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.removeMember(ws.id, user.id)),
      )
      .subscribe({
        next: () => this.members.update((l) => l.filter((m) => m.id !== user.id)),
        error: (err) => this.toast.error(ToastService.messageOf(err)),
      });
  }
}
