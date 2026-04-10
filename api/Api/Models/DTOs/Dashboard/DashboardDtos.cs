using Api.Models.Entities;

namespace Api.Models.DTOs;

public record DashboardSummaryDto(
    decimal TotalRevenue,
    decimal TotalExpense,
    decimal NetProfit,
    int TotalClients,
    int ActiveCampaigns
);

public record MonthlyFinancePointDto(
    int Year,
    int Month,
    decimal Revenue,
    decimal Expense
);

public record ActiveCampaignDto(
    Guid Id,
    string Title,
    decimal Amount,
    DateOnly StartDate,
    DateOnly? EndDate,
    CampaignStatus Status,
    Guid ClientId,
    string? ClientName
);

public record RecentClientDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    DateTime CreatedAt
);

public record DashboardOverviewDto(
    DashboardSummaryDto Summary,
    List<MonthlyFinancePointDto> MonthlyFinance,
    List<ActiveCampaignDto> ActiveCampaigns,
    List<RecentClientDto> RecentClients
);