import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

/**
 * Application routes configuration.
 *
 * Best Practices:
 * - Use lazy loading for feature modules (loadComponent)
 * - Group related routes under feature paths
 * - Apply guards at the route level
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    // Home is the main app component content - no separate component needed
    children: []
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing.component').then(m => m.PricingComponent)
  },
  {
    path: 'billing/success',
    loadComponent: () =>
      import('./features/billing/success/success.component').then(m => m.BillingSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
