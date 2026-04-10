using Api.Models.DTOs;

namespace Api.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(Guid userId);
    Task<DashboardOverviewDto> GetOverviewAsync(Guid userId);
}