# User Story 2 : Emails Transactionnels

## Contexte

On veut ajouter l'envoi d'emails transactionnels pour les événements clés : welcome, reset password, subscription confirmed. On utilise Resend comme provider (alternative : SendGrid).

## Objectif

Implémenter un service d'email avec templates HTML réutilisables.

## Prérequis

Installer le package NuGet :

```bash
cd api/Api
dotnet add package Resend
```

Ajouter les variables d'environnement dans `.env.example` :

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=YourAppName
```

## Backend — Service Email

### 1. Créer l'interface

Créer `api/Api/Services/IEmailService.cs` :

```csharp
namespace Api.Services;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string toEmail, string userName);
    Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string resetUrl);
    Task SendSubscriptionConfirmedEmailAsync(string toEmail, string planName);
    Task SendSubscriptionCanceledEmailAsync(string toEmail);
}
```

### 2. Créer l'implémentation

Créer `api/Api/Services/EmailService.cs` :

```csharp
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
        var fullResetUrl = $"{resetUrl}?token={resetToken}";
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
```

### 3. Enregistrer le service

Dans `api/Api/Extensions/ServiceCollectionExtensions.cs`, ajouter :

```csharp
// Configuration Resend
services.AddOptions();
services.AddHttpClient<ResendClient>();
services.Configure<ResendClientOptions>(options =>
{
    options.ApiToken = configuration["Email:ApiKey"] ?? "";
});
services.AddTransient<IResend, ResendClient>();
services.AddScoped<IEmailService, EmailService>();
```

### 4. Ajouter la configuration

Dans `api/Api/appsettings.json`, ajouter :

```json
{
  "Email": {
    "ApiKey": "${RESEND_API_KEY}",
    "From": "${EMAIL_FROM}",
    "FromName": "${EMAIL_FROM_NAME}"
  },
  "App": {
    "Url": "http://localhost:4200"
  }
}
```

## Fonctionnalité Password Reset

### 1. Créer l'entité PasswordResetToken

Créer `api/Api/Models/Entities/PasswordResetToken.cs` :

```csharp
namespace Api.Models.Entities;

public class PasswordResetToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool Used { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

Ajouter le DbSet dans `AppDbContext.cs` :

```csharp
public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
```

Créer la migration.

### 2. Créer les DTOs

Ajouter dans `api/Api/Models/DTOs/Auth/` :

```csharp
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
```

### 3. Ajouter les méthodes au AuthService

Ajouter à l'interface `IAuthService.cs` :

```csharp
Task<bool> ForgotPasswordAsync(string email);
Task<bool> ResetPasswordAsync(string token, string newPassword);
```

Implémenter dans `AuthService.cs` :

```csharp
public async Task<bool> ForgotPasswordAsync(string email)
{
    var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user == null)
    {
        // Ne pas révéler si l'email existe ou non
        return true;
    }

    // Invalider les anciens tokens
    var oldTokens = await _context.PasswordResetTokens
        .Where(t => t.UserId == user.Id && !t.Used)
        .ToListAsync();
    foreach (var oldToken in oldTokens)
    {
        oldToken.Used = true;
    }

    // Créer un nouveau token
    var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    var resetToken = new PasswordResetToken
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        Token = token,
        ExpiresAt = DateTime.UtcNow.AddHours(1)
    };

    _context.PasswordResetTokens.Add(resetToken);
    await _context.SaveChangesAsync();

    // Envoyer l'email
    var resetUrl = $"{_configuration["App:Url"]}/reset-password";
    await _emailService.SendPasswordResetEmailAsync(user.Email, token, resetUrl);

    return true;
}

public async Task<bool> ResetPasswordAsync(string token, string newPassword)
{
    var resetToken = await _context.PasswordResetTokens
        .Include(t => t.User)
        .FirstOrDefaultAsync(t => t.Token == token && !t.Used && t.ExpiresAt > DateTime.UtcNow);

    if (resetToken == null)
    {
        return false;
    }

    // Mettre à jour le mot de passe
    resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
    resetToken.Used = true;

    await _context.SaveChangesAsync();
    return true;
}
```

### 4. Ajouter les endpoints

Ajouter dans `AuthController.cs` :

```csharp
/// <summary>
/// Demande un email de reset password
/// </summary>
[HttpPost("forgot-password")]
public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
{
    await _authService.ForgotPasswordAsync(request.Email);
    // Toujours retourner OK pour ne pas révéler si l'email existe
    return Ok(new { message = "If an account exists with this email, you will receive a password reset link." });
}

/// <summary>
/// Reset le password avec un token valide
/// </summary>
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
{
    var success = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
    if (!success)
    {
        return BadRequest(new { error = "Invalid or expired token" });
    }

    return Ok(new { message = "Password has been reset successfully" });
}
```

## Frontend — Pages Password Reset

### 1. Page Forgot Password

Créer `frontend/src/app/features/auth/forgot-password/forgot-password.component.ts` :

```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Forgot Password</h1>

        @if (submitted()) {
          <div class="success-message">
            <p>If an account exists with this email, you will receive a password reset link.</p>
            <a routerLink="/login">Back to login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="you@example.com"
              >
            </div>

            @if (error()) {
              <div class="error">{{ error() }}</div>
            }

            <button type="submit" [disabled]="loading() || form.invalid">
              {{ loading() ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </form>

          <p class="auth-link">
            Remember your password? <a routerLink="/login">Login</a>
          </p>
        }
      </div>
    </div>
  `,
  styleUrls: ['../auth.styles.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.http.post(`${environment.apiUrl}/api/v1/auth/forgot-password`, {
      email: this.form.value.email
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('An error occurred. Please try again.');
      }
    });
  }
}
```

### 2. Page Reset Password

Créer `frontend/src/app/features/auth/reset-password/reset-password.component.ts` :

```typescript
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Reset Password</h1>

        @if (success()) {
          <div class="success-message">
            <p>Your password has been reset successfully.</p>
            <a routerLink="/login">Go to login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="password">New Password</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="********"
              >
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                placeholder="********"
              >
            </div>

            @if (error()) {
              <div class="error">{{ error() }}</div>
            }

            <button type="submit" [disabled]="loading() || form.invalid">
              {{ loading() ? 'Resetting...' : 'Reset Password' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styleUrls: ['../auth.styles.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  token = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.http.post(`${environment.apiUrl}/api/v1/auth/reset-password`, {
      token: this.token,
      newPassword: this.form.value.password
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Invalid or expired token');
      }
    });
  }
}
```

### 3. Styles partagés auth

Créer `frontend/src/app/features/auth/auth.styles.scss` :

```scss
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #f5f5f5;
}

.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;

  h1 {
    margin: 0 0 1.5rem;
    font-size: 1.5rem;
  }
}

.form-group {
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: #000;
    }
  }
}

button[type="submit"] {
  width: 100%;
  padding: 0.75rem;
  background: #000;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #333;
  }
}

.error {
  background: #fee;
  color: #c00;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.success-message {
  text-align: center;

  p {
    margin-bottom: 1rem;
    color: #444;
  }

  a {
    color: #000;
    font-weight: 500;
  }
}

.auth-link {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #666;

  a {
    color: #000;
    font-weight: 500;
  }
}
```

### 4. Ajouter les routes

Dans `app.routes.ts` :

```typescript
{
  path: 'forgot-password',
  loadComponent: () => import('./features/auth/forgot-password/forgot-password.component')
    .then(m => m.ForgotPasswordComponent)
},
{
  path: 'reset-password',
  loadComponent: () => import('./features/auth/reset-password/reset-password.component')
    .then(m => m.ResetPasswordComponent)
}
```

## Intégration avec Welcome Email

Si un endpoint `register` existe ou sera créé, ajouter l'envoi du welcome email :

```csharp
// Dans AuthService.cs, méthode RegisterAsync
await _emailService.SendWelcomeEmailAsync(user.Email, user.UserName ?? user.Email);
```

## Tests

Créer des tests unitaires pour EmailService avec mock de Resend.

## Critères de validation

- [ ] Package Resend installé et configuré
- [ ] Service EmailService injecté et fonctionnel
- [ ] Templates HTML responsive et propres
- [ ] Endpoint `POST /api/v1/auth/forgot-password` fonctionne
- [ ] Endpoint `POST /api/v1/auth/reset-password` fonctionne
- [ ] Token de reset expire après 1 heure
- [ ] Token de reset ne peut être utilisé qu'une fois
- [ ] Page frontend forgot-password fonctionne
- [ ] Page frontend reset-password fonctionne
- [ ] Email welcome prêt à être envoyé après inscription
