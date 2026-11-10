import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError } from '../models';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000, panelClass: 'toast-success' });
  }

  info(message: string, action = 'OK'): void {
    this.snackBar.open(message, action, { duration: 5000 });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Fermer', { duration: 6000, panelClass: 'toast-error' });
  }

  /** Extrait un message lisible d'une erreur HTTP renvoyée par l'API. */
  static messageOf(err: unknown, fallback = 'Une erreur est survenue'): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiError | null;
      if (body?.errors) {
        const first = Object.values(body.errors)[0];
        if (first) return first;
      }
      if (body?.message) return body.message;
      if (err.status === 0) return 'Serveur injoignable';
    }
    return fallback;
  }
}
