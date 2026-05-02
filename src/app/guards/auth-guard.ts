import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await authService.waitForAuthState();

  if (user) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
