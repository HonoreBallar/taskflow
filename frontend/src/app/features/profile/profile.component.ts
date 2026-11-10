import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormGroupDirective,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { RoleLabelPipe } from '../../shared/pipes/labels.pipe';
import { matchFields } from '../../shared/utils/validators';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AvatarComponent,
    RoleLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Mon profil</h1>
        <p>Gérez vos informations personnelles et votre sécurité.</p>
      </div>
    </div>

    @if (auth.currentUser(); as u) {
      <div class="layout">
        <section class="panel identity">
          <div class="avatar-wrap">
            <app-avatar [user]="u" [size]="112" />
            <button
              mat-mini-fab
              class="upload"
              (click)="file.click()"
              [disabled]="uploading()"
              aria-label="Changer d'avatar"
            >
              @if (uploading()) {
                <mat-spinner diameter="18" />
              } @else {
                <mat-icon>photo_camera</mat-icon>
              }
            </button>
            <input
              #file
              type="file"
              hidden
              accept=".jpg,.jpeg,.png"
              (change)="uploadAvatar(file)"
            />
          </div>
          <h2>{{ u.firstname }} {{ u.lastname }}</h2>
          <span class="chip role">{{ u.role | roleLabel }}</span>
          <small class="muted">Membre depuis le {{ u.createdAt | date: 'longDate' }}</small>
        </section>

        <div class="forms">
          <section class="panel">
            <h3>Informations</h3>
            <form [formGroup]="profile" (ngSubmit)="saveProfile()" class="form-col">
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
                @if (profile.controls.email.invalid) {
                  <mat-error>Email invalide</mat-error>
                }
              </mat-form-field>
              @if (emailChanged()) {
                <mat-form-field>
                  <mat-label>Mot de passe actuel</mat-label>
                  <input
                    matInput
                    type="password"
                    formControlName="currentPassword"
                    autocomplete="current-password"
                  />
                  <mat-hint>Requis pour changer d'adresse email</mat-hint>
                </mat-form-field>
              }
              <div class="actions">
                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="profile.invalid || profile.pristine"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </section>

          <section class="panel">
            <h3>Modifier le mot de passe</h3>
            <form
              [formGroup]="password"
              (ngSubmit)="savePassword(pwdForm)"
              #pwdForm="ngForm"
              class="form-col"
            >
              <mat-form-field>
                <mat-label>Mot de passe actuel</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="current"
                  autocomplete="current-password"
                />
              </mat-form-field>
              <div class="form-row">
                <mat-form-field>
                  <mat-label>Nouveau mot de passe</mat-label>
                  <input
                    matInput
                    type="password"
                    formControlName="next"
                    autocomplete="new-password"
                  />
                  @if (password.controls.next.hasError('minlength')) {
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
                  />
                </mat-form-field>
              </div>
              @if (password.hasError('fieldsMismatch')) {
                <small class="error">Les mots de passe ne correspondent pas</small>
              }
              <div class="actions">
                <button mat-flat-button type="submit" [disabled]="password.invalid">
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 16px;
      align-items: start;
    }
    .identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    .avatar-wrap {
      position: relative;
      margin-bottom: 8px;
    }
    .upload {
      position: absolute;
      right: -4px;
      bottom: -4px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
    }
    h3 {
      margin: 0 0 16px;
      font-size: 17px;
    }
    .role {
      background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
      color: var(--mat-sys-primary);
    }
    .forms {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .error {
      color: var(--tf-danger);
      margin-top: -8px;
    }
    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly uploading = signal(false);
  private readonly user = this.auth.currentUser()!;

  protected readonly profile = this.fb.group({
    firstname: [this.user.firstname, Validators.required],
    lastname: [this.user.lastname, Validators.required],
    email: [this.user.email, [Validators.required, Validators.email]],
    currentPassword: [''],
  });

  private readonly emailValue = toSignal(this.profile.controls.email.valueChanges, {
    initialValue: this.user.email,
  });
  /** Changer d'adresse (l'identifiant de connexion) exige de ressaisir son mot de passe. */
  protected readonly emailChanged = computed(
    () =>
      this.emailValue().trim().toLowerCase() !==
      (this.auth.currentUser()?.email ?? '').toLowerCase(),
  );

  protected readonly password = this.fb.group(
    {
      current: ['', Validators.required],
      next: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('next', 'confirm') },
  );

  saveProfile(): void {
    if (this.profile.invalid) return;
    const { currentPassword, ...identity } = this.profile.getRawValue();
    const requestedEmail = identity.email.trim().toLowerCase();
    const previousEmail = this.auth.currentUser()?.email ?? this.user.email;
    if (this.emailChanged() && !currentPassword) {
      return this.toast.error("Saisissez votre mot de passe actuel pour changer d'adresse email");
    }
    this.api
      .updateProfile(this.emailChanged() ? { ...identity, currentPassword } : identity)
      .subscribe({
        next: (u) => {
          this.auth.updateCurrentUser(u);
          this.profile.patchValue({ email: u.email, currentPassword: '' });
          this.profile.markAsPristine();
          if (u.email !== previousEmail) {
            // Changement appliqué immédiatement (vérification d'email désactivée) : les sessions sont fermées
            this.toast.info('Email modifié : veuillez vous reconnecter');
            this.auth.logout();
          } else if (requestedEmail !== u.email.toLowerCase()) {
            // L'adresse actuelle reste en vigueur tant que la nouvelle n'a pas été confirmée
            this.toast.info(
              `Un lien de confirmation a été envoyé à ${requestedEmail}. Votre adresse changera une fois ce lien ouvert.`,
            );
          } else {
            this.toast.success('Profil mis à jour');
          }
        },
        error: (err) => this.toast.error(ToastService.messageOf(err)),
      });
  }

  savePassword(form: FormGroupDirective): void {
    if (this.password.invalid) return;
    const { current, next } = this.password.getRawValue();
    this.api.changePassword(current, next).subscribe({
      next: () => {
        form.resetForm();
        // Le serveur révoque toutes les sessions existantes, y compris celle-ci
        this.toast.success('Mot de passe modifié : veuillez vous reconnecter');
        this.auth.logout();
      },
      error: (err) => this.toast.error(ToastService.messageOf(err)),
    });
  }

  uploadAvatar(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return this.toast.error('Image trop volumineuse (5 Mo max)');
    this.uploading.set(true);
    this.api.uploadAvatar(file).subscribe({
      next: (u) => {
        // Paramètre anti-cache pour forcer le rechargement de l'image
        this.auth.updateCurrentUser({
          ...u,
          avatarUrl: u.avatarUrl ? `${u.avatarUrl}?v=${Date.now()}` : null,
        });
        this.uploading.set(false);
        this.toast.success('Avatar mis à jour');
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.error(ToastService.messageOf(err));
      },
    });
  }
}
