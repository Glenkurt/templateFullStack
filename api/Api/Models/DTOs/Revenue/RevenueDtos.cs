using System.ComponentModel.DataAnnotations;

namespace Api.Models.DTOs;

public record RevenueDto(
    Guid Id,
    decimal Amount,
    DateOnly Date,
    Guid? TagId,
    string? TagName,
    Guid? ClientId,
    string? ClientName,
    DateTime CreatedAt
);

public record CreateRevenueRequest(
    [Range(0.01, double.MaxValue)]
    decimal Amount,

    DateOnly Date,
    Guid? TagId,
    Guid? ClientId
);

public record UpdateRevenueRequest(
    [Range(0.01, double.MaxValue)]
    decimal? Amount,

    DateOnly? Date,
    Guid? TagId,
    Guid? ClientId
);