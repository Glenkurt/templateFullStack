using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class CampaignService : ICampaignService
{
    private readonly AppDbContext _context;

    public CampaignService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CampaignDto>> GetCampaignsAsync(Guid userId)
    {
        return await _context.Campaigns
            .AsNoTracking()
            .Include(c => c.Client)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.StartDate)
            .ThenByDescending(c => c.CreatedAt)
            .Select(c => new CampaignDto(
                c.Id,
                c.Title,
                c.Description,
                c.Amount,
                c.StartDate,
                c.EndDate,
                c.Status,
                c.ClientId,
                c.Client != null ? $"{c.Client.FirstName} {c.Client.LastName}" : null,
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CampaignDto?> GetCampaignByIdAsync(Guid id, Guid userId)
    {
        return await _context.Campaigns
            .AsNoTracking()
            .Include(c => c.Client)
            .Where(c => c.Id == id && c.UserId == userId)
            .Select(c => new CampaignDto(
                c.Id,
                c.Title,
                c.Description,
                c.Amount,
                c.StartDate,
                c.EndDate,
                c.Status,
                c.ClientId,
                c.Client != null ? $"{c.Client.FirstName} {c.Client.LastName}" : null,
                c.CreatedAt
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<CampaignDto> CreateCampaignAsync(CreateCampaignRequest request, Guid userId)
    {
        await EnsureClientExistsForUserAsync(request.ClientId, userId);

        var campaign = new Campaign
        {
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Amount = request.Amount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = request.Status,
            ClientId = request.ClientId,
            UserId = userId
        };

        _context.Campaigns.Add(campaign);
        await _context.SaveChangesAsync();

        var clientName = await _context.Clients
            .Where(c => c.Id == campaign.ClientId)
            .Select(c => $"{c.FirstName} {c.LastName}")
            .FirstOrDefaultAsync();

        return new CampaignDto(
            campaign.Id,
            campaign.Title,
            campaign.Description,
            campaign.Amount,
            campaign.StartDate,
            campaign.EndDate,
            campaign.Status,
            campaign.ClientId,
            clientName,
            campaign.CreatedAt
        );
    }

    public async Task<CampaignDto?> UpdateCampaignAsync(Guid id, UpdateCampaignRequest request, Guid userId)
    {
        var campaign = await _context.Campaigns.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (campaign is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            campaign.Title = request.Title.Trim();
        }

        if (request.Description is not null)
        {
            campaign.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        }

        if (request.Amount.HasValue)
        {
            campaign.Amount = request.Amount.Value;
        }

        if (request.StartDate.HasValue)
        {
            campaign.StartDate = request.StartDate.Value;
        }

        if (request.EndDate.HasValue)
        {
            campaign.EndDate = request.EndDate.Value;
        }

        if (request.Status.HasValue)
        {
            campaign.Status = request.Status.Value;
        }

        if (request.ClientId.HasValue)
        {
            await EnsureClientExistsForUserAsync(request.ClientId.Value, userId);
            campaign.ClientId = request.ClientId.Value;
        }

        await _context.SaveChangesAsync();

        var clientName = await _context.Clients
            .Where(c => c.Id == campaign.ClientId)
            .Select(c => $"{c.FirstName} {c.LastName}")
            .FirstOrDefaultAsync();

        return new CampaignDto(
            campaign.Id,
            campaign.Title,
            campaign.Description,
            campaign.Amount,
            campaign.StartDate,
            campaign.EndDate,
            campaign.Status,
            campaign.ClientId,
            clientName,
            campaign.CreatedAt
        );
    }

    public async Task<bool> DeleteCampaignAsync(Guid id, Guid userId)
    {
        var campaign = await _context.Campaigns.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (campaign is null)
        {
            return false;
        }

        _context.Campaigns.Remove(campaign);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task EnsureClientExistsForUserAsync(Guid clientId, Guid userId)
    {
        var exists = await _context.Clients.AnyAsync(c => c.Id == clientId && c.UserId == userId);
        if (!exists)
        {
            throw new InvalidOperationException("Client not found.");
        }
    }
}