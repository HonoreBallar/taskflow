import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * La session repose sur un cookie HttpOnly que le navigateur joint lui-même aux requêtes :
 * le JavaScript n'a jamais accès au JWT. `withCredentials` n'est utile que si l'API est servie
 * depuis un autre domaine que le frontend (sinon le cookie est envoyé d'office).
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith(environment.apiUrl) ? req.clone({ withCredentials: true }) : req);
