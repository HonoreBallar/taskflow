import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ROLE_LABELS } from '../../core/constants/task.constants';
import { Role, User } from '../../core/models';
import { AdminService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data ? 'Modifier l’utilisateur' : 'Nouvel utilisateur' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-col">
        <div class="form-row">
          <mat-form-field>
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="firstname" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Nom</mat-label>
            <input matInput formControlName="lastname" />
          </mat-form-field>
        </div>
        <mat-form-field>
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.controls.email.invalid) {
            <mat-error>Email invalide</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ data ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe' }}</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          @if (form.controls.password.invalid) {
            <mat-error>8 caractères minimum</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Rôle</mat-label>
          <mat-select formControlName="role">
            @for (r of roles; track r) {
              <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button type="submit" [disabled]="saving()">Enregistrer</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class UserFormDialogComponent {
  protected readonly data = inject<User | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserFormDialogComponent, User>);
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly roles: Role[] = ['USER', 'MANAGER', 'ADMIN'];
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstname: [this.data?.firstname ?? '', Validators.required],
    lastname: [this.data?.lastname ?? '', Validators.required],
    email: [this.data?.email ?? '', [Validators.required, Validators.email]],
    password: [
      '',
      this.data ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)],
    ],
    role: [this.data?.role ?? ('USER' as Role)],
  });

  save(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    const body = { ...v, password: v.password || null };
    this.saving.set(true);
    (this.data ? this.api.update(this.data.id, body) : this.api.create(body)).subscribe({
      next: (u) => {
        this.toast.success(this.data ? 'Utilisateur modifié' : 'Utilisateur créé');
        this.ref.close(u);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(ToastService.messageOf(err));
      },
    });
  }
}
