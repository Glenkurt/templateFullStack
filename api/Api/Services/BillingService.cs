using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models.DTOs;

namespace Api.Services;

public class BillingService : IBillingService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<BillingService> _logger;

    public BillingService(
        AppDbContext context,
        IEmailService emailService,
        ILogger<BillingService> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public Task<string> CreateCheckoutSessionAsync(
        Guid userId,
        string priceId,
        string successUrl,
        string cancelUrl)
    {
        throw new NotImplementedException("Payment provider not configured.");
    }

    public Task<string> CreateCustomerPortalSessionAsync(Guid userId, string returnUrl)
    {
        throw new NotImplementedException("Payment provider not configured.");
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

    public Task HandleWebhookAsync(string json, string signature)
    {
        throw new NotImplementedException("Payment provider not configured.");
    }
}
