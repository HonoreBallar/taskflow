import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="brand"><mat-icon>bolt</mat-icon> TaskFlow</div>
        <h1>Connexion</h1>
        <p class="subtitle">Heureux de vous revoir 👋</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-col" novalidate>
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="email"
              data-cy="email"
            />
            <mat-icon matPrefix>mail</mat-icon>
            @if (form.controls.email.hasError('required')) {
              <mat-error>Email obligatoire</mat-error>
            } @else if (form.controls.email.hasError('email')) {
              <mat-error>Email invalide</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Mot de passe</mat-label>
            <input
              matInput
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              data-cy="password"
            />
            <mat-icon matPrefix>lock</mat-icon>
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="showPassword.set(!showPassword())"
              aria-label="Afficher le mot de passe"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.controls.password.hasError('required')) {
              <mat-error>Mot de passe obligatoire</mat-error>
            }
          </mat-form-field>

          <a routerLink="/auth/forgot-password" class="forgot">Mot de passe oublié ?</a>

          <button mat-flat-button type="submit" [disabled]="loading()" data-cy="login-submit">
            @if (loading()) {
              <mat-spinner diameter="20" />
            } @else {
              Se connecter
            }
          </button>
        </form>

        <p class="footer">
          Pas encore de compte ? <a routerLink="/auth/register">Créer un compte</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .forgot {
      align-self: flex-end;
      font-size: 14px;
      margin-top: -6px;
    }
    button[type='submit'] {
      height: 44px;
    }
    mat-spinner {
      margin: 0 auto;
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Paramètre de requête ?returnUrl= (liaison des inputs de route) */
  readonly returnUrl = input<string>();

  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.toast.success(`Bienvenue ${res.user.firstname} !`);
        this.router.navigateByUrl(this.returnUrl() || '/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(ToastService.messageOf(err, 'Connexion impossible'));
      },
    });
  }
}
