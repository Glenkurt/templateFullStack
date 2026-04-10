using System.ComponentModel.DataAnnotations;

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

public record UpdateExpenseRequest(
    [MaxLength(200)]
    string? Name,

    [Range(0.01, double.MaxValue)]
    decimal? Amount,

    DateOnly? Date,
    Guid? TagId
);