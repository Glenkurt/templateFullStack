using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.Models.DTOs;

public record ExpenseDto(
    Guid Id,
    string Name,
    decimal Amount,
    DateOnly Date,
    Guid? TagId,
    string? TagName,
    DateTime CreatedAt
);

public record CreateExpenseRequest(
    [Required]
    [MaxLength(200)]
    string Name,

    [Range(0.01, double.MaxValue)]
    decimal Amount,

    DateOnly Date,
    Guid? TagId
);

public class UpdateExpenseRequest
{
    private Guid? _tagId;

    [MaxLength(200)]
    public string? Name { get; init; }

    [Range(0.01, double.MaxValue)]
    public decimal? Amount { get; init; }

    public DateOnly? Date { get; init; }

    [JsonIgnore]
    public bool TagIdSpecified { get; private set; }

    public Guid? TagId
    {
        get => _tagId;
        set
        {
            _tagId = value;
            TagIdSpecified = true;
        }
    }
}