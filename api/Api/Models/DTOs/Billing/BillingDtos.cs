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
