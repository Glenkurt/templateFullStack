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
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing.component').then(m => m.PricingComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then(m => m.ClientsComponent)
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/expenses.component').then(m => m.ExpensesComponent)
      },
      {
        path: 'revenues',
        loadComponent: () =>
          import('./features/revenues/revenues.component').then(m => m.RevenuesComponent)
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./features/campaigns/campaigns.component').then(m => m.CampaignsComponent)
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'billing/success',
        loadComponent: () =>
          import('./features/billing/success/success.component').then(
            m => m.BillingSuccessComponent
          )
      }
    ]
  },
  {
    path: 'billing/success',
    loadComponent: () =>
      import('./features/billing/success/success.component').then(m => m.BillingSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
