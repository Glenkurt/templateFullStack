using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(Guid userId)
    {
        var totalRevenue = await _context.Revenues
            .Where(r => r.UserId == userId)
            .SumAsync(r => (decimal?)r.Amount) ?? 0m;

        var totalExpense = await _context.Expenses
            .Where(e => e.UserId == userId)
            .SumAsync(e => (decimal?)e.Amount) ?? 0m;

        var totalClients = await _context.Clients
            .Where(c => c.UserId == userId)
            .CountAsync();

        var activeCampaigns = await _context.Campaigns
            .Where(c => c.UserId == userId && c.Status == CampaignStatus.Active)
            .CountAsync();

        return new DashboardSummaryDto(
            TotalRevenue: totalRevenue,
            TotalExpense: totalExpense,
            NetProfit: totalRevenue - totalExpense,
            TotalClients: totalClients,
            ActiveCampaigns: activeCampaigns
        );
    }

    public async Task<DashboardOverviewDto> GetOverviewAsync(Guid userId)
    {
        var summary = await GetSummaryAsync(userId);

        var start = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddMonths(-11));
        var monthlyRevenue = await _context.Revenues
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.Date >= start)
            .GroupBy(r => new { r.Date.Year, r.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(x => x.Amount) })
            .ToListAsync();

        var monthlyExpense = await _context.Expenses
            .AsNoTracking()
            .Where(e => e.UserId == userId && e.Date >= start)
            .GroupBy(e => new { e.Date.Year, e.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(x => x.Amount) })
            .ToListAsync();

        var revenueLookup = monthlyRevenue.ToDictionary(x => (x.Year, x.Month), x => x.Total);
        var expenseLookup = monthlyExpense.ToDictionary(x => (x.Year, x.Month), x => x.Total);

        var points = new List<MonthlyFinancePointDto>(12);
        for (var i = 0; i < 12; i++)
        {
            var monthDate = DateTime.UtcNow.Date.AddMonths(-(11 - i));
            var key = (monthDate.Year, monthDate.Month);

            points.Add(new MonthlyFinancePointDto(
                monthDate.Year,
                monthDate.Month,
                revenueLookup.GetValueOrDefault(key, 0m),
                expenseLookup.GetValueOrDefault(key, 0m)
            ));
        }

        var activeCampaigns = await _context.Campaigns
            .AsNoTracking()
            .Include(c => c.Client)
            .Where(c => c.UserId == userId && c.Status == CampaignStatus.Active)
            .OrderBy(c => c.StartDate)
            .Select(c => new ActiveCampaignDto(
                c.Id,
                c.Title,
                c.Amount,
                c.StartDate,
                c.EndDate,
                c.Status,
                c.ClientId,
                c.Client != null ? $"{c.Client.FirstName} {c.Client.LastName}" : null
            ))
            .ToListAsync();

        var recentClients = await _context.Clients
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Take(5)
            .Select(c => new RecentClientDto(
                c.Id,
                c.FirstName,
                c.LastName,
                c.Email,
                c.CreatedAt
            ))
            .ToListAsync();

        return new DashboardOverviewDto(summary, points, activeCampaigns, recentClients);
    }
}