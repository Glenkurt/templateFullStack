namespace Api.Services;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string toEmail, string userName);
    Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string resetUrl);
    Task SendSubscriptionConfirmedEmailAsync(string toEmail, string planName);
    Task SendSubscriptionCanceledEmailAsync(string toEmail);
}
