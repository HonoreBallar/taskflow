import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
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
        <h1>Mot de passe oublié</h1>
        @if (sent()) {
          <p class="subtitle">
            Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.
            <br /><small class="muted"
              >(En développement, le lien est affiché dans les logs du backend.)</small
            >
          </p>
        } @else {
          <p class="subtitle">Saisissez votre email pour recevoir un lien de réinitialisation.</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="form-col">
            <mat-form-field>
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
              @if (form.controls.email.invalid) {
                <mat-error>Email valide obligatoire</mat-error>
              }
            </mat-form-field>
            <button mat-flat-button type="submit" [disabled]="loading()">Envoyer le lien</button>
          </form>
        }
        <p class="footer"><a routerLink="/auth/login">Retour à la connexion</a></p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => this.sent.set(true),
      error: (err) => {
        this.loading.set(false);
        this.toast.error(ToastService.messageOf(err));
      },
    });
  }
}
