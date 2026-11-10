import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EXPIRES_KEY, USER_KEY } from '../constants/storage.constants';
import { credentialsInterceptor } from '../interceptors/credentials.interceptor';
import { AuthResponse } from '../models';
import { AuthService } from './auth.service';

describe('AuthService + credentialsInterceptor', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const response: AuthResponse = {
    expiresIn: 3600000,
    user: {
      id: 1,
      firstname: 'Honore',
      lastname: 'Amounan',
      email: 'honore@taskflow.com',
      role: 'MANAGER',
      avatarUrl: null,
      blocked: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => http.verify());

  it('ouvre la session après connexion sans jamais stocker de token', () => {
    configure();
    service.login({ email: 'honore@taskflow.com', password: 'secret123' }).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.isManager()).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
    expect(service.fullName()).toBe('Honore Amounan');
    // Le JWT vit dans un cookie HttpOnly : rien qui y ressemble n'est accessible au JavaScript
    expect(Object.keys(localStorage).sort()).toEqual([EXPIRES_KEY, USER_KEY].sort());
    expect(JSON.stringify(localStorage)).not.toContain('token');
  });

  it("joint le cookie de session aux appels à l'API, sans header Authorization", () => {
    configure();
    TestBed.inject(HttpClient).get('/api/projects').subscribe();
    const req = http.expectOne('/api/projects');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it("n'ouvre pas de session à l'inscription tant que l'email n'est pas confirmé", () => {
    configure();
    service
      .register({ firstname: 'A', lastname: 'B', email: 'a@b.c', password: 'secret123' })
      .subscribe();
    http
      .expectOne('/api/auth/register')
      .flush({ verificationRequired: true, expiresIn: null, user: null });
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('restaure la session au rechargement, sauf si elle est expirée', () => {
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    localStorage.setItem(EXPIRES_KEY, String(Date.now() - 1000));
    configure();
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('demande au serveur d’effacer le cookie et vide la session à la déconnexion', () => {
    configure();
    service.login({ email: 'a@b.c', password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);
    service.logout(false);
    http.expectOne('/api/auth/logout').flush(null);
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});
