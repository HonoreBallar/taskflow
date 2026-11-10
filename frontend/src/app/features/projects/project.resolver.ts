import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Project } from '../../core/models';
import { ProjectService } from '../../core/services/api.services';
import { ToastService } from '../../core/services/toast.service';

/** Charge le projet avant l'activation de la route ; redirige vers la liste s'il est introuvable ou interdit. */
export const projectResolver: ResolveFn<Project> = (route) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  return inject(ProjectService)
    .get(Number(route.paramMap.get('id')))
    .pipe(
      catchError((err) => {
        toast.error(ToastService.messageOf(err, 'Projet introuvable'));
        return of(new RedirectCommand(router.parseUrl('/projects')));
      }),
    );
};
