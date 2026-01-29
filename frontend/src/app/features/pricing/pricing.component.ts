import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BillingService, StripeConfig } from '../../services/billing.service';
import { AuthService } from '../../core/services/auth.service';

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  features: string[];
  popular?: boolean;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pricing-container">
      <div class="pricing-header">
        <h1>Simple, transparent pricing</h1>
        <p>Choose the plan that's right for you</p>
      </div>

      <div class="pricing-grid">
        @for (plan of plans(); track plan.id) {
          <div class="pricing-card" [class.popular]="plan.popular">
            @if (plan.popular) {
              <div class="popular-badge">Most Popular</div>
            }
            <h2>{{ plan.name }}</h2>
            <div class="price">
              <span class="amount">\${{ plan.price }}</span>
              <span class="period">/month</span>
            </div>
            <ul class="features">
              @for (feature of plan.features; track feature) {
                <li>{{ feature }}</li>
              }
            </ul>
            <button
              (click)="subscribe(plan)"
              [disabled]="loading()"
              [class.loading]="loadingPlan() === plan.id"
            >
              {{ loadingPlan() === plan.id ? 'Loading...' : 'Get Started' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pricing-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 4rem 1rem;
    }

    .pricing-header {
      text-align: center;
      margin-bottom: 3rem;

      h1 {
        font-size: 2.5rem;
        margin: 0 0 0.5rem;
      }

      p {
        color: #666;
        font-size: 1.125rem;
      }
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }

    .pricing-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 12px;
      padding: 2rem;
      position: relative;

      &.popular {
        border-color: #000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      h2 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
      }

      .popular-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: #000;
        color: white;
        padding: 0.25rem 1rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .price {
        margin-bottom: 1.5rem;

        .amount {
          font-size: 3rem;
          font-weight: 700;
        }

        .period {
          color: #666;
        }
      }

      .features {
        list-style: none;
        padding: 0;
        margin: 0 0 2rem;

        li {
          padding: 0.5rem 0;
          color: #444;

          &::before {
            content: '\\2713';
            margin-right: 0.5rem;
            color: #000;
          }
        }
      }

      button {
        width: 100%;
        padding: 1rem;
        background: #000;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;

        &:hover:not(:disabled) {
          background: #333;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  `]
})
export class PricingComponent implements OnInit {
  private billingService = inject(BillingService);
  private authService = inject(AuthService);
  private router = inject(Router);

  plans = signal<Plan[]>([]);
  loading = signal(false);
  loadingPlan = signal<string | null>(null);

  ngOnInit(): void {
    this.billingService.loadConfig().subscribe(config => {
      this.plans.set([
        {
          id: 'starter',
          name: 'Starter',
          price: 9,
          priceId: config.prices.starter,
          features: [
            '1,000 requests/month',
            'All formats supported',
            'Email support',
            'API access'
          ]
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 29,
          priceId: config.prices.pro,
          features: [
            '10,000 requests/month',
            'Priority processing',
            'Batch API',
            'Priority support',
            'Webhooks'
          ],
          popular: true
        }
      ]);
    });
  }

  subscribe(plan: Plan): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/pricing' } });
      return;
    }

    this.loading.set(true);
    this.loadingPlan.set(plan.id);

    this.billingService.createCheckoutSession(plan.priceId).subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: (err) => {
        this.loading.set(false);
        this.loadingPlan.set(null);
        console.error('Checkout error:', err);
      }
    });
  }
}
