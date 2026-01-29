import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscriptionDto {
  status: string;
  planId: string;
  currentPeriodEnd: string | null;
  isActive: boolean;
}

export interface StripeConfig {
  publishableKey: string;
  prices: {
    starter: string;
    pro: string;
  };
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/v1/billing`;

  subscription = signal<SubscriptionDto | null>(null);
  config = signal<StripeConfig | null>(null);

  loadConfig(): Observable<StripeConfig> {
    return this.http.get<StripeConfig>(`${this.apiUrl}/config`).pipe(
      tap(config => this.config.set(config))
    );
  }

  loadSubscription(): Observable<SubscriptionDto> {
    return this.http.get<SubscriptionDto>(`${this.apiUrl}/subscription`).pipe(
      tap(sub => this.subscription.set(sub))
    );
  }

  createCheckoutSession(priceId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/create-checkout-session`, {
      priceId,
      successUrl: `${window.location.origin}/billing/success`,
      cancelUrl: `${window.location.origin}/pricing`
    });
  }

  createPortalSession(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/portal`, {
      returnUrl: `${window.location.origin}/dashboard`
    });
  }
}
