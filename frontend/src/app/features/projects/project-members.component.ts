import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User } from '../../core/models';
import { ProjectService, WorkspaceService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';
import { ProjectContextService } from './project-context.service';

@Component({
  selector: 'app-project-members',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AvatarComponent,
    RoleLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      @if (ctx.canManage()) {
        <div class="add">
          <mat-form-field class="grow">
            <mat-label>Ajouter un membre du workspace</mat-label>
            <mat-select [(ngModel)]="selected">
              @for (u of candidates(); track u.id) {
                <mat-option [value]="u.id"
                  >{{ u.firstname }} {{ u.lastname }} — {{ u.email }}</mat-option
                >
              } @empty {
                <mat-option disabled
                  >Tous les membres du workspace sont déjà dans le projet</mat-option
                >
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button [disabled]="!selected" (click)="add()">
            <mat-icon>person_add</mat-icon>Ajouter
          </button>
        </div>
      }

      @for (m of ctx.members(); track m.id) {
        <div class="member">
          <app-avatar [user]="m" [size]="40" />
          <div class="text">
            <strong>{{ m.firstname }} {{ m.lastname }}</strong>
            <small class="muted">{{ m.email }} · {{ m.role | roleLabel }}</small>
          </div>
          @if (ctx.canManage()) {
            <button mat-icon-button (click)="remove(m)" matTooltip="Retirer du projet">
              <mat-icon>person_remove</mat-icon>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .add {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .grow {
      flex: 1 1 300px;
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
    .text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
  `,
})
export class ProjectMembersComponent {
  protected readonly ctx = inject(ProjectContextService);
  private readonly api = inject(ProjectService);
  private readonly wsApi = inject(WorkspaceService);
  private readonly toast = inject(ToastService);

  protected selected: number | null = null;
  private readonly workspaceMembers = signal<User[]>([]);

  protected readonly candidates = computed(() => {
    const ids = new Set(this.ctx.members().map((m) => m.id));
    return this.workspaceMembers().filter((u) => !ids.has(u.id));
  });

  constructor() {
    effect(() => {
      const p = this.ctx.project();
      if (p && this.ctx.canManage())
        this.wsApi.members(p.workspaceId).subscribe((list) => this.workspaceMembers.set(list));
    });
  }

  add(): void {
    const p = this.ctx.project();
    if (!p || !this.selected) return;
    this.api.addMember(p.id, this.selected).subscribe({
      next: () => {
        this.selected = null;
        this.ctx.refresh();
        this.toast.success('Membre ajouté');
      },
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  remove(user: User): void {
    const p = this.ctx.project();
    if (!p) return;
    this.api.removeMember(p.id, user.id).subscribe({
      next: () => this.ctx.refresh(),
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }
}
