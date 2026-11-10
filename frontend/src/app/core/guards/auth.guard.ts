import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Role } from '../models';
import { AuthService } from '../services/auth.service';

/** Protège les routes privées : redirige vers la connexion si l'utilisateur n'est pas authentifié. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Empêche un utilisateur connecté de revenir sur les écrans de connexion/inscription. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

/** Restreint une route (et son chargement lazy) à certains rôles : canMatch: [roleGuard('ADMIN')]. */
export const roleGuard =
  (...roles: Role[]): CanMatchFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/dashboard']);
  };
