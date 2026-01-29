using Stripe;
using Stripe.Checkout;
using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models.DTOs;

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

        // Get or create Stripe customer
        string customerId;
        if (!string.IsNullOrEmpty(user.Subscription?.StripeCustomerId))
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

        // Determine plan
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

        return session.Url ?? throw new InvalidOperationException("Failed to create checkout session");
    }

    public async Task<string> CreateCustomerPortalSessionAsync(Guid userId, string returnUrl)
    {
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (string.IsNullOrEmpty(subscription?.StripeCustomerId))
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

        // Get Stripe subscription details
        var subscriptionService = new Stripe.SubscriptionService();
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

        // Send confirmation email
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

        // Send cancellation email
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
