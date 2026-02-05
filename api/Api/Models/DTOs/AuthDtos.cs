using System.ComponentModel.DataAnnotations;

namespace Api.Models.DTOs;

/// <summary>
/// Request DTO for user login.
/// </summary>
/// <param name="Email">User's email address.</param>
/// <param name="Password">User's password.</param>
public record LoginRequestDto(
    [Required]
    [EmailAddress]
    string Email,

    [Required]
    [MinLength(6)]
    string Password
);

/// <summary>
/// Request DTO for token refresh.
/// </summary>
/// <param name="RefreshToken">Valid refresh token from previous authentication.</param>
public record RefreshTokenRequestDto(
    string? RefreshToken
);

/// <summary>
/// Response DTO for successful authentication.
/// </summary>
/// <param name="AccessToken">JWT access token for API authorization.</param>
/// <param name="RefreshToken">Refresh token for obtaining new access tokens.</param>
/// <param name="ExpiresIn">Access token expiry time in seconds.</param>
/// <param name="TokenType">Token type, typically "Bearer".</param>
public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string TokenType
);

/// <summary>
/// Request DTO for forgot password.
/// </summary>
public record ForgotPasswordRequest(
    [Required]
    [EmailAddress]
    string Email
);

/// <summary>
/// Request DTO for password reset.
/// </summary>
public record ResetPasswordRequest(
    [Required]
    string Token,

    [Required]
    [MinLength(8)]
    string NewPassword
);
