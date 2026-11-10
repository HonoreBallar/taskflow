import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { matchFields } from '../../shared/utils/validators';

@Component({
  selector: 'app-register',
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
        @if (pendingEmail(); as email) {
          <h1>Vérifiez votre boîte mail</h1>
          <p class="subtitle" data-cy="verification-sent">
            Si l'adresse <strong>{{ email }}</strong> n'est pas déjà associée à un compte, un lien
            de confirmation vient de lui être envoyé. Ouvrez-le pour activer votre compte, puis
            connectez-vous.
          </p>
          <p class="subtitle">
            <small class="muted"
              >Le lien est valable 24 heures. Pensez à vérifier vos courriers indésirables.</small
            >
          </p>
        } @else {
          <h1>Créer un compte</h1>
          <p class="subtitle">Organisez vos projets en équipe.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="form-col" novalidate>
            <div class="form-row">
              <mat-form-field>
                <mat-label>Nom</mat-label>
                <input
                  matInput
                  formControlName="lastname"
                  autocomplete="family-name"
                  data-cy="lastname"
                />
                @if (form.controls.lastname.invalid) {
                  <mat-error>Nom obligatoire</mat-error>
                }
              </mat-form-field>
              <mat-form-field>
                <mat-label>Prénom</mat-label>
                <input
                  matInput
                  formControlName="firstname"
                  autocomplete="given-name"
                  data-cy="firstname"
                />
                @if (form.controls.firstname.invalid) {
                  <mat-error>Prénom obligatoire</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field>
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                autocomplete="email"
                data-cy="email"
              />
              @if (form.controls.email.hasError('required')) {
                <mat-error>Email obligatoire</mat-error>
              } @else if (form.controls.email.hasError('email')) {
                <mat-error>Email invalide</mat-error>
              } @else if (form.controls.email.hasError('taken')) {
                <mat-error>Cet email est déjà utilisé</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Mot de passe</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
                data-cy="password"
              />
              <mat-hint>8 caractères minimum</mat-hint>
              @if (form.controls.password.hasError('required')) {
                <mat-error>Mot de passe obligatoire</mat-error>
              } @else if (form.controls.password.hasError('minlength')) {
                <mat-error>8 caractères minimum</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Confirmation</mat-label>
              <input
                matInput
                type="password"
                formControlName="confirm"
                autocomplete="new-password"
                data-cy="confirm"
              />
              @if (form.controls.confirm.hasError('required')) {
                <mat-error>Confirmation obligatoire</mat-error>
              }
            </mat-form-field>
            @if (form.hasError('fieldsMismatch') && form.controls.confirm.touched) {
              <p class="error-text">Les mots de passe ne correspondent pas</p>
            }

            <button mat-flat-button type="submit" [disabled]="loading()" data-cy="register-submit">
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Créer mon compte
              }
            </button>
          </form>
        }

        <p class="footer">Déjà inscrit ? <a routerLink="/auth/login">Se connecter</a></p>
      </div>
    </div>
  `,
  styles: `
    .error-text {
      color: var(--tf-danger);
      font-size: 13px;
      margin: -8px 0 0;
    }
    button[type='submit'] {
      height: 44px;
    }
    mat-spinner {
      margin: 0 auto;
    }
  `,
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  /** Adresse en attente de confirmation : affiche le message « vérifiez votre boîte mail » à la place du formulaire. */
  protected readonly pendingEmail = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      lastname: ['', Validators.required],
      firstname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirm') },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { confirm: _confirm, ...payload } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.register(payload).subscribe({
      next: (res) => {
        if (res.verificationRequired) {
          // Aucune session n'est ouverte tant que l'adresse email n'a pas été confirmée
          this.loading.set(false);
          this.pendingEmail.set(payload.email);
          return;
        }
        this.toast.success('Compte créé avec succès');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.form.controls.email.setErrors({ taken: true });
        } else {
          this.toast.error(ToastService.messageOf(err, 'Inscription impossible'));
        }
      },
    });
  }
}
