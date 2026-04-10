using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Api.Models.DTOs;
using Api.Services;

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
    /// Creates a Stripe Checkout session to start a subscription
    /// </summary>
    [Authorize]
    [HttpPost("create-checkout-session")]
    [ProducesResponseType(typeof(CheckoutSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
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
    /// Creates a session to the Stripe Customer Portal
    /// </summary>
    [Authorize]
    [HttpPost("portal")]
    [ProducesResponseType(typeof(PortalSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PortalSessionResponse>> CreatePortalSession(
        [FromBody] CreatePortalSessionRequest request)
    {
        var userId = GetUserId();
        var url = await _billingService.CreateCustomerPortalSessionAsync(userId, request.ReturnUrl);

        return Ok(new PortalSessionResponse(url));
    }

    /// <summary>
    /// Gets the current user's subscription status
    /// </summary>
    [Authorize]
    [HttpGet("subscription")]
    [ProducesResponseType(typeof(SubscriptionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SubscriptionDto>> GetSubscription()
    {
        var userId = GetUserId();
        var subscription = await _billingService.GetSubscriptionAsync(userId);

        return Ok(subscription);
    }

    /// <summary>
    /// Stripe webhook endpoint (no auth, verified by signature)
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();

        try
        {
            await _billingService.HandleWebhookAsync(json, signature);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    /// <summary>
    /// Returns Stripe public keys for the frontend
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
