import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If auth state hasn't been initialized yet, block navigation
  // The guard will be re-evaluated once auth is initialized
  if (!authService.isAuthInitialized()) {
    return false;
  }

  // Once auth is initialized, check if user is authenticated
  if (authService.isAuthenticated()) {
    return true;
  }

  // If not authenticated, redirect to login
  router.navigate(['/login']);
  return false;
};
