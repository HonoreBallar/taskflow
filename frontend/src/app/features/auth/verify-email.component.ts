import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Page ouverte depuis le lien reçu par email (/verify-email?token=…) : confirme l'adresse d'un nouveau
 * compte ou un changement d'adresse. Accessible connecté ou non.
 */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="brand"><mat-icon>bolt</mat-icon> TaskFlow</div>
        @switch (state()) {
          @case ('pending') {
            <h1>Confirmation en cours…</h1>
            <mat-spinner diameter="36" />
          }
          @case ('done') {
            <h1>Adresse confirmée</h1>
            <p class="subtitle" data-cy="verify-result">{{ message() }}</p>
            <a mat-flat-button routerLink="/auth/login">Se connecter</a>
          }
          @case ('error') {
            <h1>Lien invalide</h1>
            <p class="subtitle" data-cy="verify-result">{{ message() }}</p>
            <p class="subtitle">
              <small class="muted">
                Pour recevoir un nouveau lien, connectez-vous avec votre email et votre mot de
                passe.
              </small>
            </p>
            <a mat-flat-button routerLink="/auth/login">Retour à la connexion</a>
          }
        }
      </div>
    </div>
  `,
  styles: `
    mat-spinner {
      margin: 16px auto;
    }
    a[mat-flat-button] {
      width: 100%;
      height: 44px;
    }
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly auth = inject(AuthService);

  /** Paramètre de requête ?token= (liaison des inputs de route) */
  readonly token = input<string>();

  protected readonly state = signal<'pending' | 'done' | 'error'>('pending');
  protected readonly message = signal('');

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.message.set('Ce lien de confirmation est incomplet.');
      this.state.set('error');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: (res) => {
        this.message.set(res.message);
        this.state.set('done');
      },
      error: (err) => {
        this.message.set(
          ToastService.messageOf(err, 'Ce lien de confirmation est invalide ou a expiré.'),
        );
        this.state.set('error');
      },
    });
  }
}
