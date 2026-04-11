using System.Text.Json.Serialization;

namespace Api.Models.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CampaignStatus
{
    Draft,
    Active,
    Completed,
    Cancelled
}

public class Campaign
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public CampaignStatus Status { get; set; } = CampaignStatus.Draft;
    public Guid ClientId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Client? Client { get; set; }
    public ApplicationUser? User { get; set; }
}
