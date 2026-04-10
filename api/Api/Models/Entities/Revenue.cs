namespace Api.Models.Entities;

public class Revenue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public Guid? TagId { get; set; }
    public Guid? ClientId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tag? Tag { get; set; }
    public Client? Client { get; set; }
    public ApplicationUser? User { get; set; }
}
