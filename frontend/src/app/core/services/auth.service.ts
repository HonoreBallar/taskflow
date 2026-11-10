import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EXPIRES_KEY, USER_KEY } from '../constants/storage.constants';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  Role,
  User,
  VerifyEmailResponse,
} from '../models';

/**
 * État d'authentification basé sur les Signals.
 *
 * Le JWT n'est jamais manipulé par le frontend : le serveur le pose dans un cookie HttpOnly, que le
 * navigateur joint de lui-même aux appels à l'API. Un script injecté dans la page ne peut donc pas le lire.
 * Seuls le profil de l'utilisateur et la date d'expiration de la session sont gardés dans le localStorage,
 * pour restaurer l'affichage après un rechargement ; l'accès réel reste décidé par le serveur (401 → déconnexion).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly _user = signal<User | null>(this.readSession());

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly isManager = computed(() => this.role() === 'ADMIN' || this.role() === 'MANAGER');
  readonly fullName = computed(() => {
    const u = this._user();
    return u ? `${u.firstname} ${u.lastname}` : '';
  });

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/login`, payload)
      .pipe(tap((res) => this.storeSession(res)));
  }

  /** Si le serveur exige la confirmation de l'adresse email, aucune session n'est ouverte à l'inscription. */
  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.api}/register`, payload).pipe(
      tap((res) => {
        if (!res.verificationRequired && res.user && res.expiresIn) {
          this.storeSession({ user: res.user, expiresIn: res.expiresIn });
        }
      }),
    );
  }

  /** Confirme une adresse email à partir du jeton reçu par email (inscription ou changement d'adresse). */
  verifyEmail(token: string): Observable<VerifyEmailResponse> {
    return this.http.post<VerifyEmailResponse>(`${this.api}/verify-email`, { token }).pipe(
      tap((res) => {
        // Un changement d'adresse ferme toutes les sessions côté serveur
        if (res.emailChanged) this.clearSession();
      }),
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.api}/reset-password`, { token, password });
  }

  /** Met à jour l'utilisateur courant (après modification du profil ou de l'avatar). */
  updateCurrentUser(user: User): void {
    this._user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  hasRole(...roles: Role[]): boolean {
    const r = this.role();
    return !!r && roles.includes(r);
  }

  logout(redirect = true): void {
    // Le cookie étant HttpOnly, seul le serveur peut l'effacer
    this.http.post<void>(`${this.api}/logout`, {}).subscribe({ error: () => undefined });
    this.clearSession();
    if (redirect) this.router.navigate(['/auth/login']);
  }

  private clearSession(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    this._user.set(null);
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + res.expiresIn));
    this._user.set(res.user);
  }

  /** Retourne l'utilisateur mémorisé si sa session n'est pas expirée. */
  private readSession(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));
      if (!raw || !expiresAt || expiresAt < Date.now()) {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(EXPIRES_KEY);
        return null;
      }
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
