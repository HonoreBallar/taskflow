import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Role } from '../models';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard, roleGuard } from './auth.guard';

describe('Guards', () => {
  const authenticated = signal(false);
  const role = signal<Role | null>(null);
  const authStub = {
    isAuthenticated: authenticated,
    role,
    hasRole: (...roles: Role[]) => !!role() && roles.includes(role()!),
  };

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/projects' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    });
  });

  it('authGuard redirige vers /auth/login avec returnUrl si non connecté', () => {
    authenticated.set(false);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/auth/login?returnUrl=%2Fprojects');
  });

  it('authGuard laisse passer un utilisateur connecté', () => {
    authenticated.set(true);
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBeTrue();
  });

  it('guestGuard renvoie un utilisateur connecté vers le dashboard', () => {
    authenticated.set(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/dashboard');
  });

  it('roleGuard autorise uniquement les rôles listés', () => {
    role.set('USER');
    const denied = TestBed.runInInjectionContext(() => roleGuard('ADMIN')({} as never, []));
    expect(denied instanceof UrlTree).toBeTrue();

    role.set('ADMIN');
    expect(TestBed.runInInjectionContext(() => roleGuard('ADMIN')({} as never, []))).toBeTrue();
  });
});
