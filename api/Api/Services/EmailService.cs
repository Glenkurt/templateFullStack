namespace Api.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendWelcomeEmailAsync(string toEmail, string userName)
    {
        _logger.LogInformation("[Email stub] Welcome email to {Email}", toEmail);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string resetUrl)
    {
        _logger.LogInformation("[Email stub] Password reset email to {Email}", toEmail);
        return Task.CompletedTask;
    }

    public Task SendSubscriptionConfirmedEmailAsync(string toEmail, string planName)
    {
        _logger.LogInformation("[Email stub] Subscription confirmed email to {Email}", toEmail);
        return Task.CompletedTask;
    }

    public Task SendSubscriptionCanceledEmailAsync(string toEmail)
    {
        _logger.LogInformation("[Email stub] Subscription canceled email to {Email}", toEmail);
        return Task.CompletedTask;
    }
}
