using System.ComponentModel.DataAnnotations;

namespace Api.Models.DTOs;

public record ClientDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? CompanyName,
    DateTime CreatedAt
);

public record CreateClientRequest(
    [Required]
    [MaxLength(100)]
    string FirstName,

    [Required]
    [MaxLength(100)]
    string LastName,

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    string Email,

    [MaxLength(50)]
    string? Phone,

    [MaxLength(200)]
    string? CompanyName
);

public record UpdateClientRequest(
    [MaxLength(100)]
    string? FirstName,

    [MaxLength(100)]
    string? LastName,

    [EmailAddress]
    [MaxLength(256)]
    string? Email,

    [MaxLength(50)]
    string? Phone,

    [MaxLength(200)]
    string? CompanyName
);