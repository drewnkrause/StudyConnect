import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkAuth = (): boolean | UrlTree => {
    if (authService.isAuthenticated()) {
      return true;
    }
    return router.createUrlTree(['/login']);
  };

  if (authService.isAuthInitialized()) {
    return checkAuth();
  }

  return toObservable(authService.authInitialized$).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => checkAuth())
  );
};
