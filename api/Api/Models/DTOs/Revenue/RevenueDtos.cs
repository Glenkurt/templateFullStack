using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

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

public class UpdateRevenueRequest
{
    private Guid? _tagId;
    private Guid? _clientId;

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

    [JsonIgnore]
    public bool ClientIdSpecified { get; private set; }

    public Guid? ClientId
    {
        get => _clientId;
        set
        {
            _clientId = value;
            ClientIdSpecified = true;
        }
    }
}