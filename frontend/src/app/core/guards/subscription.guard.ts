import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { map, catchError, of } from 'rxjs';

export const subscriptionGuard: CanActivateFn = () => {
  const billingService = inject(BillingService);
  const router = inject(Router);

  return billingService.loadSubscription().pipe(
    map(subscription => {
      if (subscription.isActive) {
        return true;
      }
      router.navigate(['/pricing']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/pricing']);
      return of(false);
    })
  );
};
