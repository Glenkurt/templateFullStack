namespace Api.Models.Entities;

public class Expense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public Guid? TagId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tag? Tag { get; set; }
    public ApplicationUser? User { get; set; }
}
