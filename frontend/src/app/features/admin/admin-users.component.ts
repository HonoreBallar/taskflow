import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { ROLE_LABELS } from '../../core/constants/task.constants';
import { Role, User } from '../../core/models';
import { AdminService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { confirmDialog } from '../../shared/components/confirm-dialog.component';
import { UserFormDialogComponent } from './user-form-dialog.component';

@Component({
  selector: 'app-admin-users',
  imports: [
    DatePipe,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    AvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <mat-form-field class="grow">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Filtrer les utilisateurs</mat-label>
        <input matInput [ngModel]="search()" (ngModelChange)="search.set($event)" />
      </mat-form-field>
      <button mat-flat-button (click)="openForm()">
        <mat-icon>person_add</mat-icon>Créer un utilisateur
      </button>
    </div>

    <div class="panel table-wrap">
      <table mat-table [dataSource]="filtered()" [trackBy]="trackById">
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
          <td mat-cell *matCellDef="let u">
            <span class="user">
              <app-avatar [user]="u" [size]="32" />
              <span
                ><strong>{{ u.firstname }} {{ u.lastname }}</strong
                ><br /><small class="muted">{{ u.email }}</small></span
              >
            </span>
          </td>
        </ng-container>
        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Rôle</th>
          <td mat-cell *matCellDef="let u">
            <mat-select
              class="role-select"
              [value]="u.role"
              (selectionChange)="setRole(u, $event.value)"
              [disabled]="u.id === me()"
            >
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
              }
            </mat-select>
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Statut</th>
          <td mat-cell *matCellDef="let u">
            <span class="chip" [class.blocked]="u.blocked" [class.active]="!u.blocked">{{
              u.blocked ? 'Bloqué' : 'Actif'
            }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Inscription</th>
          <td mat-cell *matCellDef="let u">{{ u.createdAt | date: 'd MMM y' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u">
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="openForm(u)"><mat-icon>edit</mat-icon>Modifier</button>
              @if (u.id !== me()) {
                <button mat-menu-item (click)="toggleBlock(u)">
                  <mat-icon>{{ u.blocked ? 'lock_open' : 'block' }}</mat-icon
                  >{{ u.blocked ? 'Débloquer' : 'Bloquer' }}
                </button>
                <button mat-menu-item (click)="remove(u)">
                  <mat-icon>delete</mat-icon>Supprimer
                </button>
              }
            </mat-menu>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" [class.row-blocked]="row.blocked"></tr>
      </table>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .grow {
      flex: 1 1 260px;
    }
    .table-wrap {
      padding: 0;
      overflow-x: auto;
    }
    table {
      min-width: 720px;
      background: transparent;
    }
    .user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
    }
    .role-select {
      width: 150px;
    }
    .chip.active {
      background: #d1fae5;
      color: #047857;
    }
    .chip.blocked {
      background: #fee2e2;
      color: #b91c1c;
    }
    .row-blocked {
      opacity: 0.65;
    }
  `,
})
export class AdminUsersComponent {
  private readonly api = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly users = signal<User[]>([]);
  protected readonly search = signal('');
  protected readonly me = computed(() => this.auth.currentUser()?.id);
  protected readonly roles: Role[] = ['USER', 'MANAGER', 'ADMIN'];
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly columns = ['user', 'role', 'status', 'createdAt', 'actions'];
  protected readonly trackById = (_: number, u: User) => u.id;

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.users().filter((u) =>
          `${u.firstname} ${u.lastname} ${u.email}`.toLowerCase().includes(q),
        )
      : this.users();
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.users().subscribe((list) => this.users.set(list));
  }

  private replace(user: User): void {
    this.users.update((l) => l.map((u) => (u.id === user.id ? user : u)));
  }

  openForm(user?: User): void {
    this.dialog
      .open(UserFormDialogComponent, { data: user ?? null, width: '520px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.reload());
  }

  setRole(user: User, role: Role): void {
    this.api.setRole(user.id, role).subscribe({
      next: (u) => {
        this.replace(u);
        this.toast.success(`${u.firstname} est maintenant ${ROLE_LABELS[role]}`);
      },
      error: (err) => {
        this.toast.error(ToastService.messageOf(err));
        this.reload();
      },
    });
  }

  toggleBlock(user: User): void {
    this.api.setBlocked(user.id, !user.blocked).subscribe({
      next: (u) => {
        this.replace(u);
        this.toast.success(u.blocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué');
      },
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  remove(user: User): void {
    confirmDialog(this.dialog, {
      title: "Supprimer l'utilisateur",
      message: `Supprimer définitivement ${user.firstname} ${user.lastname} ? Ses tâches seront désaffectées.`,
      confirmText: 'Supprimer',
      danger: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(user.id)),
      )
      .subscribe({
        next: () => {
          this.users.update((l) => l.filter((u) => u.id !== user.id));
          this.toast.success('Utilisateur supprimé');
        },
        error: (err) => this.toast.error(ToastService.messageOf(err)),
      });
  }
}
