using Api.Models.DTOs;

namespace Api.Services;

/// <summary>
/// Service interface for authentication operations.
/// Provides JWT token generation and validation.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Authenticates a user and generates JWT tokens.
    /// </summary>
    /// <param name="request">Login credentials.</param>
    /// <returns>Authentication response with tokens, or null if authentication fails.</returns>
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto request);

    /// <summary>
    /// Refreshes an expired access token using a valid refresh token.
    /// </summary>
    /// <param name="request">Refresh token request.</param>
    /// <returns>New authentication response with fresh tokens, or null if refresh fails.</returns>
    Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenRequestDto request);

    /// <summary>
    /// Generates a new JWT access token for a user.
    /// </summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <param name="email">The user's email address.</param>
    /// <param name="roles">The user's roles.</param>
    /// <returns>JWT access token string.</returns>
    string GenerateAccessToken(string userId, string email, IEnumerable<string> roles);

    /// <summary>
    /// Generates a new refresh token.
    /// </summary>
    /// <returns>Refresh token string.</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// Initiates the password reset process by sending an email with a reset link.
    /// </summary>
    /// <param name="email">The user's email address.</param>
    /// <returns>True if email was sent (always returns true to prevent email enumeration).</returns>
    Task<bool> ForgotPasswordAsync(string email);

    /// <summary>
    /// Resets the user's password using a valid reset token.
    /// </summary>
    /// <param name="token">The password reset token.</param>
    /// <param name="newPassword">The new password.</param>
    /// <returns>True if password was reset successfully, false if token is invalid or expired.</returns>
    Task<bool> ResetPasswordAsync(string token, string newPassword);
}
