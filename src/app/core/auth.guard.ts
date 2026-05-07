import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Simulation: Check if user is "admin"
  // In a real app, you'd check a UserSignal or AuthService
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (isAdmin) {
    return true;
  } else {
    // Redirect to home if not authorized
    alert('Restricted Area! (Simulating 403)');
    return router.createUrlTree(['/']);
  }
};
