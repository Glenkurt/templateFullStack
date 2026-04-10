using System.ComponentModel.DataAnnotations;
using Api.Models.Entities;

namespace Api.Models.DTOs;

public record TagDto(
    Guid Id,
    string Name,
    TagCategory Category,
    DateTime CreatedAt
);

public record CreateTagRequest(
    [Required]
    [MaxLength(100)]
    string Name,

    TagCategory Category
);

public record UpdateTagRequest(
    [MaxLength(100)]
    string? Name,

    TagCategory? Category
);