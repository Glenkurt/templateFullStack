using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class RevenueService : IRevenueService
{
    private readonly AppDbContext _context;

    public RevenueService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<RevenueDto>> GetRevenuesAsync(Guid userId)
    {
        return await _context.Revenues
            .AsNoTracking()
            .Include(r => r.Tag)
            .Include(r => r.Client)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .Select(r => new RevenueDto(
                r.Id,
                r.Amount,
                r.Date,
                r.Tag != null && r.Tag.UserId == userId ? r.TagId : null,
                r.Tag != null && r.Tag.UserId == userId ? r.Tag.Name : null,
                r.Client != null && r.Client.UserId == userId ? r.ClientId : null,
                r.Client != null && r.Client.UserId == userId ? $"{r.Client.FirstName} {r.Client.LastName}" : null,
                r.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<RevenueDto?> GetRevenueByIdAsync(Guid id, Guid userId)
    {
        return await _context.Revenues
            .AsNoTracking()
            .Include(r => r.Tag)
            .Include(r => r.Client)
            .Where(r => r.Id == id && r.UserId == userId)
            .Select(r => new RevenueDto(
                r.Id,
                r.Amount,
                r.Date,
                r.Tag != null && r.Tag.UserId == userId ? r.TagId : null,
                r.Tag != null && r.Tag.UserId == userId ? r.Tag.Name : null,
                r.Client != null && r.Client.UserId == userId ? r.ClientId : null,
                r.Client != null && r.Client.UserId == userId ? $"{r.Client.FirstName} {r.Client.LastName}" : null,
                r.CreatedAt
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<RevenueDto> CreateRevenueAsync(CreateRevenueRequest request, Guid userId)
    {
        if (request.TagId.HasValue)
        {
            await EnsureTagExistsForUserAsync(request.TagId.Value, userId, TagCategory.Revenue);
        }

        if (request.ClientId.HasValue)
        {
            await EnsureClientExistsForUserAsync(request.ClientId.Value, userId);
        }

        var revenue = new Revenue
        {
            Amount = request.Amount,
            Date = request.Date,
            TagId = request.TagId,
            ClientId = request.ClientId,
            UserId = userId
        };

        _context.Revenues.Add(revenue);
        await _context.SaveChangesAsync();

        var tagName = revenue.TagId.HasValue
            ? await _context.Tags
                .Where(t => t.Id == revenue.TagId.Value && t.UserId == userId && t.Category == TagCategory.Revenue)
                .Select(t => t.Name)
                .FirstOrDefaultAsync()
            : null;

        var clientName = revenue.ClientId.HasValue
            ? await _context.Clients
                .Where(c => c.Id == revenue.ClientId.Value && c.UserId == userId)
                .Select(c => $"{c.FirstName} {c.LastName}")
                .FirstOrDefaultAsync()
            : null;

        return new RevenueDto(
            revenue.Id,
            revenue.Amount,
            revenue.Date,
            revenue.TagId,
            tagName,
            revenue.ClientId,
            clientName,
            revenue.CreatedAt
        );
    }

    public async Task<RevenueDto?> UpdateRevenueAsync(Guid id, UpdateRevenueRequest request, Guid userId)
    {
        var revenue = await _context.Revenues.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (revenue is null)
        {
            return null;
        }

        if (request.Amount.HasValue)
        {
            revenue.Amount = request.Amount.Value;
        }

        if (request.Date.HasValue)
        {
            revenue.Date = request.Date.Value;
        }

        if (request.TagIdSpecified)
        {
            if (request.TagId.HasValue)
            {
                await EnsureTagExistsForUserAsync(request.TagId.Value, userId, TagCategory.Revenue);
            }

            revenue.TagId = request.TagId;
        }

        if (request.ClientIdSpecified)
        {
            if (request.ClientId.HasValue)
            {
                await EnsureClientExistsForUserAsync(request.ClientId.Value, userId);
            }

            revenue.ClientId = request.ClientId;
        }

        await _context.SaveChangesAsync();

        var tagName = revenue.TagId.HasValue
            ? await _context.Tags
                .Where(t => t.Id == revenue.TagId.Value && t.UserId == userId && t.Category == TagCategory.Revenue)
                .Select(t => t.Name)
                .FirstOrDefaultAsync()
            : null;

        var clientName = revenue.ClientId.HasValue
            ? await _context.Clients
                .Where(c => c.Id == revenue.ClientId.Value && c.UserId == userId)
                .Select(c => $"{c.FirstName} {c.LastName}")
                .FirstOrDefaultAsync()
            : null;

        return new RevenueDto(
            revenue.Id,
            revenue.Amount,
            revenue.Date,
            revenue.TagId,
            tagName,
            revenue.ClientId,
            clientName,
            revenue.CreatedAt
        );
    }

    public async Task<bool> DeleteRevenueAsync(Guid id, Guid userId)
    {
        var revenue = await _context.Revenues.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (revenue is null)
        {
            return false;
        }

        _context.Revenues.Remove(revenue);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task EnsureTagExistsForUserAsync(Guid tagId, Guid userId, TagCategory category)
    {
        var tag = await _context.Tags
            .AsNoTracking()
            .Where(t => t.Id == tagId && t.UserId == userId)
            .Select(t => new { t.Category })
            .FirstOrDefaultAsync();

        if (tag is null)
        {
            throw new InvalidOperationException("Tag not found.");
        }

        if (tag.Category != category)
        {
            throw new InvalidOperationException("Tag category is invalid.");
        }
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