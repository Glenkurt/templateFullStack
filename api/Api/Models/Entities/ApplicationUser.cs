namespace Api.Models.Entities;

/// <summary>
/// Minimal user entity for authentication scaffolding.
/// Replace/extend with full identity model as needed.
/// </summary>
public class ApplicationUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// User role. Possible values: "User", "Admin", "Owner"
    /// </summary>
    public string Role { get; set; } = "User";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public Subscription? Subscription { get; set; }
}
