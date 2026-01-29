# User Story 3 : Stripe Subscriptions

## Contexte

On veut implémenter un système de paiement par abonnement avec Stripe. Les utilisateurs pourront souscrire à différents plans (Starter, Pro) via Stripe Checkout, et gérer leur abonnement via le Customer Portal.

## Prérequis

Installer le package NuGet :

```bash
cd api/Api
dotnet add package Stripe.net
```

Ajouter les variables d'environnement dans `.env.example` :

```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_STARTER=price_xxxxx
STRIPE_PRICE_ID_PRO=price_xxxxx
```

## Base de données

Créer l'entité `Subscription` dans `api/Api/Models/Entities/Subscription.cs` :

```csharp
namespace Api.Models.Entities;

public class Subscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public string StripeCustomerId { get; set; } = string.Empty;
    public string StripeSubscriptionId { get; set; } = string.Empty;
    public string Status { get; set; } = "inactive"; // active, canceled, past_due, trialing, inactive
    public string PlanId { get; set; } = string.Empty; // starter, pro
    public string StripePriceId { get; set; } = string.Empty;
    public DateTime? CurrentPeriodStart { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

Ajouter le DbSet dans `AppDbContext.cs` :

```csharp
public DbSet<Subscription> Subscriptions => Set<Subscription>();
```

Ajouter une propriété de navigation dans `ApplicationUser.cs` :

```csharp
public Subscription? Subscription { get; set; }
```

Créer la migration.

## Backend — Service Billing

### 1. Créer les DTOs

Créer `api/Api/Models/DTOs/Billing/BillingDtos.cs` :

```csharp
namespace Api.Models.DTOs;

public record CreateCheckoutSessionRequest(
    string PriceId,
    string SuccessUrl,
    string CancelUrl
);

public record CreatePortalSessionRequest(string ReturnUrl);

public record SubscriptionDto(
    string Status,
    string PlanId,
    DateTime? CurrentPeriodEnd,
    bool IsActive
)
{
    public static SubscriptionDto Empty => new("inactive", "", null, false);
}

public record CheckoutSessionResponse(string Url);
public record PortalSessionResponse(string Url);
```

### 2. Créer l'interface

Créer `api/Api/Services/IBillingService.cs` :

```csharp
namespace Api.Services;

public interface IBillingService
{
    Task<string> CreateCheckoutSessionAsync(Guid userId, string priceId, string successUrl, string cancelUrl);
    Task<string> CreateCustomerPortalSessionAsync(Guid userId, string returnUrl);
    Task<SubscriptionDto> GetSubscriptionAsync(Guid userId);
    Task HandleWebhookAsync(string json, string stripeSignature);
}
```

### 3. Créer l'implémentation

Créer `api/Api/Services/BillingService.cs` :

```csharp
using Stripe;
using Stripe.Checkout;
using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;

namespace Api.Services;

public class BillingService : IBillingService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly ILogger<BillingService> _logger;

    public BillingService(
        AppDbContext context,
        IConfiguration configuration,
        IEmailService emailService,
        ILogger<BillingService> logger)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
        _logger = logger;

        StripeConfiguration.ApiKey = configuration["Stripe:SecretKey"];
    }

    public async Task<string> CreateCheckoutSessionAsync(
        Guid userId,
        string priceId,
        string successUrl,
        string cancelUrl)
    {
        var user = await _context.Users
            .Include(u => u.Subscription)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            throw new InvalidOperationException("User not found");

        // Récupérer ou créer le customer Stripe
        string customerId;
        if (user.Subscription?.StripeCustomerId != null)
        {
            customerId = user.Subscription.StripeCustomerId;
        }
        else
        {
            var customerService = new CustomerService();
            var customer = await customerService.CreateAsync(new CustomerCreateOptions
            {
                Email = user.Email,
                Metadata = new Dictionary<string, string>
                {
                    { "userId", userId.ToString() }
                }
            });
            customerId = customer.Id;
        }

        // Déterminer le plan
        var planId = GetPlanIdFromPriceId(priceId);

        var options = new SessionCreateOptions
        {
            Customer = customerId,
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = priceId,
                    Quantity = 1,
                }
            },
            Mode = "subscription",
            SuccessUrl = successUrl + "?session_id={CHECKOUT_SESSION_ID}",
            CancelUrl = cancelUrl,
            Metadata = new Dictionary<string, string>
            {
                { "userId", userId.ToString() },
                { "planId", planId }
            }
        };

        var sessionService = new SessionService();
        var session = await sessionService.CreateAsync(options);

        return session.Url;
    }

    public async Task<string> CreateCustomerPortalSessionAsync(Guid userId, string returnUrl)
    {
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (subscription?.StripeCustomerId == null)
            throw new InvalidOperationException("No subscription found");

        var options = new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = subscription.StripeCustomerId,
            ReturnUrl = returnUrl,
        };

        var service = new Stripe.BillingPortal.SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task<SubscriptionDto> GetSubscriptionAsync(Guid userId)
    {
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (subscription == null)
            return SubscriptionDto.Empty;

        return new SubscriptionDto(
            subscription.Status,
            subscription.PlanId,
            subscription.CurrentPeriodEnd,
            subscription.Status == "active" || subscription.Status == "trialing"
        );
    }

    public async Task HandleWebhookAsync(string json, string stripeSignature)
    {
        var webhookSecret = _configuration["Stripe:WebhookSecret"];
        var stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, webhookSecret);

        _logger.LogInformation("Processing Stripe webhook: {EventType}", stripeEvent.Type);

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutSessionCompleted(stripeEvent);
                break;

            case "customer.subscription.updated":
                await HandleSubscriptionUpdated(stripeEvent);
                break;

            case "customer.subscription.deleted":
                await HandleSubscriptionDeleted(stripeEvent);
                break;

            case "invoice.payment_failed":
                await HandlePaymentFailed(stripeEvent);
                break;
        }
    }

    private async Task HandleCheckoutSessionCompleted(Event stripeEvent)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session == null) return;

        var userId = Guid.Parse(session.Metadata["userId"]);
        var planId = session.Metadata["planId"];

        var user = await _context.Users
            .Include(u => u.Subscription)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return;

        // Récupérer les détails de la subscription Stripe
        var subscriptionService = new SubscriptionService();
        var stripeSubscription = await subscriptionService.GetAsync(session.SubscriptionId);

        if (user.Subscription == null)
        {
            user.Subscription = new Models.Entities.Subscription
            {
                Id = Guid.NewGuid(),
                UserId = userId
            };
            _context.Subscriptions.Add(user.Subscription);
        }

        user.Subscription.StripeCustomerId = session.CustomerId;
        user.Subscription.StripeSubscriptionId = session.SubscriptionId;
        user.Subscription.Status = stripeSubscription.Status;
        user.Subscription.PlanId = planId;
        user.Subscription.StripePriceId = stripeSubscription.Items.Data[0].Price.Id;
        user.Subscription.CurrentPeriodStart = stripeSubscription.CurrentPeriodStart;
        user.Subscription.CurrentPeriodEnd = stripeSubscription.CurrentPeriodEnd;
        user.Subscription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Envoyer l'email de confirmation
        await _emailService.SendSubscriptionConfirmedEmailAsync(user.Email, planId);

        _logger.LogInformation("Subscription created for user {UserId}, plan {PlanId}", userId, planId);
    }

    private async Task HandleSubscriptionUpdated(Event stripeEvent)
    {
        var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
        if (stripeSubscription == null) return;

        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscription.Id);

        if (subscription == null) return;

        subscription.Status = stripeSubscription.Status;
        subscription.CurrentPeriodStart = stripeSubscription.CurrentPeriodStart;
        subscription.CurrentPeriodEnd = stripeSubscription.CurrentPeriodEnd;
        subscription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Subscription updated: {SubscriptionId}, status: {Status}",
            stripeSubscription.Id, stripeSubscription.Status);
    }

    private async Task HandleSubscriptionDeleted(Event stripeEvent)
    {
        var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
        if (stripeSubscription == null) return;

        var subscription = await _context.Subscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscription.Id);

        if (subscription == null) return;

        subscription.Status = "canceled";
        subscription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Envoyer l'email d'annulation
        await _emailService.SendSubscriptionCanceledEmailAsync(subscription.User.Email);

        _logger.LogInformation("Subscription canceled: {SubscriptionId}", stripeSubscription.Id);
    }

    private async Task HandlePaymentFailed(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice == null) return;

        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeCustomerId == invoice.CustomerId);

        if (subscription == null) return;

        subscription.Status = "past_due";
        subscription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogWarning("Payment failed for subscription: {SubscriptionId}", subscription.Id);
    }

    private string GetPlanIdFromPriceId(string priceId)
    {
        if (priceId == _configuration["Stripe:PriceIdStarter"]) return "starter";
        if (priceId == _configuration["Stripe:PriceIdPro"]) return "pro";
        return "unknown";
    }
}
```

### 4. Créer le contrôleur

Créer `api/Api/Controllers/BillingController.cs` :

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Api.Controllers;

[ApiController]
[Route("api/v1/billing")]
public class BillingController : ControllerBase
{
    private readonly IBillingService _billingService;
    private readonly IConfiguration _configuration;

    public BillingController(IBillingService billingService, IConfiguration configuration)
    {
        _billingService = billingService;
        _configuration = configuration;
    }

    /// <summary>
    /// Crée une session Stripe Checkout pour démarrer un abonnement
    /// </summary>
    [Authorize]
    [HttpPost("create-checkout-session")]
    public async Task<ActionResult<CheckoutSessionResponse>> CreateCheckoutSession(
        [FromBody] CreateCheckoutSessionRequest request)
    {
        var userId = GetUserId();
        var url = await _billingService.CreateCheckoutSessionAsync(
            userId,
            request.PriceId,
            request.SuccessUrl,
            request.CancelUrl
        );

        return Ok(new CheckoutSessionResponse(url));
    }

    /// <summary>
    /// Crée une session vers le Customer Portal Stripe
    /// </summary>
    [Authorize]
    [HttpPost("portal")]
    public async Task<ActionResult<PortalSessionResponse>> CreatePortalSession(
        [FromBody] CreatePortalSessionRequest request)
    {
        var userId = GetUserId();
        var url = await _billingService.CreateCustomerPortalSessionAsync(userId, request.ReturnUrl);

        return Ok(new PortalSessionResponse(url));
    }

    /// <summary>
    /// Récupère le statut d'abonnement de l'utilisateur
    /// </summary>
    [Authorize]
    [HttpGet("subscription")]
    public async Task<ActionResult<SubscriptionDto>> GetSubscription()
    {
        var userId = GetUserId();
        var subscription = await _billingService.GetSubscriptionAsync(userId);

        return Ok(subscription);
    }

    /// <summary>
    /// Webhook Stripe (pas d'auth, vérifié par signature)
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"];

        try
        {
            await _billingService.HandleWebhookAsync(json, signature!);
            return Ok();
        }
        catch (Stripe.StripeException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    /// <summary>
    /// Retourne les clés publiques Stripe pour le frontend
    /// </summary>
    [HttpGet("config")]
    public ActionResult GetConfig()
    {
        return Ok(new
        {
            publishableKey = _configuration["Stripe:PublishableKey"],
            prices = new
            {
                starter = _configuration["Stripe:PriceIdStarter"],
                pro = _configuration["Stripe:PriceIdPro"]
            }
        });
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
```

### 5. Configuration

Ajouter dans `appsettings.json` :

```json
{
  "Stripe": {
    "SecretKey": "${STRIPE_SECRET_KEY}",
    "PublishableKey": "${STRIPE_PUBLISHABLE_KEY}",
    "WebhookSecret": "${STRIPE_WEBHOOK_SECRET}",
    "PriceIdStarter": "${STRIPE_PRICE_ID_STARTER}",
    "PriceIdPro": "${STRIPE_PRICE_ID_PRO}"
  }
}
```

### 6. Enregistrer le service

Dans `ServiceCollectionExtensions.cs` :

```csharp
services.AddScoped<IBillingService, BillingService>();
```

## Frontend — Composants Billing

### 1. Service Billing

Créer `frontend/src/app/services/billing.service.ts` :

```typescript
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
  private apiUrl = `${environment.apiUrl}/api/v1/billing`;

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
      returnUrl: `${window.location.origin}/account`
    });
  }
}
```

### 2. Page Pricing

Créer `frontend/src/app/features/pricing/pricing.component.ts` :

```typescript
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
  styleUrls: ['./pricing.component.scss']
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
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/pricing' } });
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
```

**pricing.component.scss** :

```scss
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
```

### 3. Page Success

Créer `frontend/src/app/features/billing/success/success.component.ts` :

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-billing-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="success-container">
      <div class="success-card">
        <div class="success-icon">*</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for subscribing. Your account has been upgraded.</p>
        <a routerLink="/dashboard" class="btn">Go to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .success-card {
      text-align: center;
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 { margin: 0 0 1rem; }
    p { color: #666; margin-bottom: 2rem; }
    .btn {
      display: inline-block;
      background: #000;
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
    }
  `]
})
export class BillingSuccessComponent {}
```

### 4. Composant Account Billing

Créer `frontend/src/app/features/account/billing/account-billing.component.ts` :

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BillingService, SubscriptionDto } from '../../../services/billing.service';

@Component({
  selector: 'app-account-billing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="billing-section">
      <h2>Subscription</h2>

      @if (loading()) {
        <p>Loading...</p>
      } @else if (subscription(); as sub) {
        @if (sub.isActive) {
          <div class="subscription-info">
            <div class="plan-badge">{{ sub.planId | titlecase }} Plan</div>
            <p class="status">Status: <strong>{{ sub.status }}</strong></p>
            @if (sub.currentPeriodEnd) {
              <p class="renewal">
                Next billing date: {{ sub.currentPeriodEnd | date:'mediumDate' }}
              </p>
            }
            <button (click)="openPortal()" [disabled]="portalLoading()">
              {{ portalLoading() ? 'Loading...' : 'Manage Subscription' }}
            </button>
          </div>
        } @else {
          <div class="no-subscription">
            <p>You don't have an active subscription.</p>
            <a routerLink="/pricing" class="btn">View Plans</a>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .billing-section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #eee;
    }
    h2 { margin: 0 0 1rem; font-size: 1.25rem; }
    .plan-badge {
      display: inline-block;
      background: #000;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .status, .renewal { margin: 0.5rem 0; color: #666; }
    button, .btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #000;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .no-subscription p { color: #666; margin-bottom: 1rem; }
  `]
})
export class AccountBillingComponent implements OnInit {
  private billingService = inject(BillingService);

  subscription = signal<SubscriptionDto | null>(null);
  loading = signal(true);
  portalLoading = signal(false);

  ngOnInit(): void {
    this.billingService.loadSubscription().subscribe({
      next: (sub) => {
        this.subscription.set(sub);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openPortal(): void {
    this.portalLoading.set(true);
    this.billingService.createPortalSession().subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: () => this.portalLoading.set(false)
    });
  }
}
```

### 5. Guard d'abonnement

Créer `frontend/src/app/core/guards/subscription.guard.ts` :

```typescript
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
```

### 6. Ajouter les routes

Dans `app.routes.ts` :

```typescript
{
  path: 'pricing',
  loadComponent: () => import('./features/pricing/pricing.component')
    .then(m => m.PricingComponent)
},
{
  path: 'billing/success',
  loadComponent: () => import('./features/billing/success/success.component')
    .then(m => m.BillingSuccessComponent),
  canActivate: [authGuard]
}
```

## Tests

Créer des tests d'intégration pour les endpoints billing avec mocks Stripe.

## Critères de validation

- [ ] Package Stripe.net installé et configuré
- [ ] Table Subscription créée avec migration
- [ ] `POST /api/v1/billing/create-checkout-session` redirige vers Stripe
- [ ] `POST /api/v1/billing/webhook` traite les events Stripe
- [ ] `GET /api/v1/billing/subscription` retourne le statut
- [ ] `POST /api/v1/billing/portal` redirige vers Customer Portal
- [ ] Page Pricing affiche les plans avec boutons
- [ ] Après paiement, subscription créée via webhook
- [ ] Email de confirmation envoyé après subscription
- [ ] Page Account affiche le statut d'abonnement
- [ ] Guard `subscriptionGuard` protège les routes premium
