using System.ComponentModel.DataAnnotations;
using Api.Models.Entities;

namespace Api.Models.DTOs;

public record CampaignDto(
    Guid Id,
    string Title,
    string? Description,
    decimal Amount,
    DateOnly StartDate,
    DateOnly? EndDate,
    CampaignStatus Status,
    Guid ClientId,
    string? ClientName,
    DateTime CreatedAt
);

public record CreateCampaignRequest(
    [Required]
    [MaxLength(200)]
    string Title,

    [MaxLength(2000)]
    string? Description,

    [Range(0.01, double.MaxValue)]
    decimal Amount,

    DateOnly StartDate,
    DateOnly? EndDate,
    CampaignStatus Status,
    Guid ClientId
);

public record UpdateCampaignRequest(
    [MaxLength(200)]
    string? Title,

    [MaxLength(2000)]
    string? Description,

    [Range(0.01, double.MaxValue)]
    decimal? Amount,

    DateOnly? StartDate,
    DateOnly? EndDate,
    CampaignStatus? Status,
    Guid? ClientId
);