using Resend;

namespace Api.Services;

public class EmailService : IEmailService
{
    private readonly IResend _resend;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string _appUrl;

    public EmailService(
        IResend resend,
        IConfiguration configuration,
        ILogger<EmailService> logger)
    {
        _resend = resend;
        _configuration = configuration;
        _logger = logger;
        _fromEmail = configuration["Email:From"] ?? "noreply@example.com";
        _fromName = configuration["Email:FromName"] ?? "App";
        _appUrl = configuration["App:Url"] ?? "http://localhost:4200";
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string userName)
    {
        var html = GetWelcomeTemplate(userName);
        await SendEmailAsync(toEmail, $"Welcome to {_fromName}!", html);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string resetUrl)
    {
        var fullResetUrl = $"{resetUrl}?token={Uri.EscapeDataString(resetToken)}";
        var html = GetPasswordResetTemplate(fullResetUrl);
        await SendEmailAsync(toEmail, "Reset your password", html);
    }

    public async Task SendSubscriptionConfirmedEmailAsync(string toEmail, string planName)
    {
        var html = GetSubscriptionConfirmedTemplate(planName);
        await SendEmailAsync(toEmail, "Subscription confirmed!", html);
    }

    public async Task SendSubscriptionCanceledEmailAsync(string toEmail)
    {
        var html = GetSubscriptionCanceledTemplate();
        await SendEmailAsync(toEmail, "Subscription canceled", html);
    }

    private async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        try
        {
            var message = new EmailMessage
            {
                From = $"{_fromName} <{_fromEmail}>",
                To = new[] { to },
                Subject = subject,
                HtmlBody = htmlBody
            };

            await _resend.EmailSendAsync(message);
            _logger.LogInformation("Email sent to {Email}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}: {Subject}", to, subject);
            throw;
        }
    }

    private string GetWelcomeTemplate(string userName) => $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Welcome</title>
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 600px; margin: 0 auto; padding: 40px 20px;"">
    <tr>
      <td style=""background-color: #ffffff; border-radius: 8px; padding: 40px;"">
        <h1 style=""margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;"">Welcome, {userName}!</h1>
        <p style=""margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #444;"">
          Thanks for signing up. You're all set to start using {_fromName}.
        </p>
        <a href=""{_appUrl}/dashboard"" style=""display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;"">
          Go to Dashboard
        </a>
        <p style=""margin: 32px 0 0; font-size: 14px; color: #888;"">
          If you have any questions, just reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>";

    private string GetPasswordResetTemplate(string resetUrl) => $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Reset Password</title>
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 600px; margin: 0 auto; padding: 40px 20px;"">
    <tr>
      <td style=""background-color: #ffffff; border-radius: 8px; padding: 40px;"">
        <h1 style=""margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;"">Reset your password</h1>
        <p style=""margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #444;"">
          Click the button below to reset your password. This link will expire in 1 hour.
        </p>
        <a href=""{resetUrl}"" style=""display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;"">
          Reset Password
        </a>
        <p style=""margin: 32px 0 0; font-size: 14px; color: #888;"">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>";

    private string GetSubscriptionConfirmedTemplate(string planName) => $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Subscription Confirmed</title>
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 600px; margin: 0 auto; padding: 40px 20px;"">
    <tr>
      <td style=""background-color: #ffffff; border-radius: 8px; padding: 40px;"">
        <h1 style=""margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;"">You're subscribed!</h1>
        <p style=""margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #444;"">
          Thanks for subscribing to the <strong>{planName}</strong> plan. Your subscription is now active.
        </p>
        <a href=""{_appUrl}/dashboard"" style=""display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;"">
          Get Started
        </a>
      </td>
    </tr>
  </table>
</body>
</html>";

    private string GetSubscriptionCanceledTemplate() => $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Subscription Canceled</title>
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 600px; margin: 0 auto; padding: 40px 20px;"">
    <tr>
      <td style=""background-color: #ffffff; border-radius: 8px; padding: 40px;"">
        <h1 style=""margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;"">Subscription canceled</h1>
        <p style=""margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #444;"">
          Your subscription has been canceled. You'll continue to have access until the end of your current billing period.
        </p>
        <p style=""margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #444;"">
          We'd love to have you back! If you change your mind, you can resubscribe anytime.
        </p>
        <a href=""{_appUrl}/pricing"" style=""display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;"">
          View Plans
        </a>
      </td>
    </tr>
  </table>
</body>
</html>";
}
