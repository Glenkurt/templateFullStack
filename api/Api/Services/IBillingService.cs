using Api.Models.DTOs;

namespace Api.Services;

public interface IBillingService
{
    Task<string> CreateCheckoutSessionAsync(Guid userId, string priceId, string successUrl, string cancelUrl);
    Task<string> CreateCustomerPortalSessionAsync(Guid userId, string returnUrl);
    Task<SubscriptionDto> GetSubscriptionAsync(Guid userId);
    Task HandleWebhookAsync(string json, string stripeSignature);
}
