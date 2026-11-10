import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Déconnecte l'utilisateur si le token est expiré/invalide (401) et signale les erreurs serveur. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 && !req.url.includes('/auth/')) {
          auth.logout();
          toast.error('Session expirée, veuillez vous reconnecter');
        } else if (err.status === 0 || err.status >= 500) {
          toast.error(ToastService.messageOf(err, 'Erreur serveur, réessayez plus tard'));
        }
      }
      return throwError(() => err);
    }),
  );
};
