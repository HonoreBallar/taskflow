import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { matchFields } from '../../shared/utils/validators';

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="brand"><mat-icon>bolt</mat-icon> TaskFlow</div>
        <h1>Nouveau mot de passe</h1>
        <p class="subtitle">Choisissez un nouveau mot de passe (8 caractères minimum).</p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-col">
          <mat-form-field>
            <mat-label>Nouveau mot de passe</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            @if (form.controls.password.invalid) {
              <mat-error>8 caractères minimum</mat-error>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label>Confirmation</mat-label>
            <input matInput type="password" formControlName="confirm" autocomplete="new-password" />
          </mat-form-field>
          @if (form.hasError('fieldsMismatch')) {
            <small style="color: var(--tf-danger)">Les mots de passe ne correspondent pas</small>
          }
          <button mat-flat-button type="submit" [disabled]="loading() || !token()">
            Réinitialiser
          </button>
        </form>
        <p class="footer"><a routerLink="/auth/login">Retour à la connexion</a></p>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly token = input<string>();
  protected readonly loading = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirm') },
  );

  submit(): void {
    if (this.form.invalid || !this.token()) return this.form.markAllAsTouched();
    this.loading.set(true);
    this.auth.resetPassword(this.token()!, this.form.getRawValue().password).subscribe({
      next: () => {
        this.toast.success('Mot de passe modifié, vous pouvez vous connecter');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(ToastService.messageOf(err));
      },
    });
  }
}
