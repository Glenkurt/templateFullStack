using Api.Data;
using Api.Models.DTOs;
using Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class TagService : ITagService
{
    private readonly AppDbContext _context;

    public TagService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TagDto>> GetTagsAsync(Guid userId, TagCategory? category)
    {
        var query = _context.Tags
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (category.HasValue)
        {
            query = query.Where(t => t.Category == category.Value);
        }

        return await query
            .OrderBy(t => t.Name)
            .Select(t => new TagDto(t.Id, t.Name, t.Category, t.CreatedAt))
            .ToListAsync();
    }

    public async Task<TagDto?> GetTagByIdAsync(Guid id, Guid userId)
    {
        return await _context.Tags
            .AsNoTracking()
            .Where(t => t.Id == id && t.UserId == userId)
            .Select(t => new TagDto(t.Id, t.Name, t.Category, t.CreatedAt))
            .FirstOrDefaultAsync();
    }

    public async Task<TagDto> CreateTagAsync(CreateTagRequest request, Guid userId)
    {
        var normalizedName = request.Name.Trim().ToLowerInvariant();
        var exists = await _context.Tags.AnyAsync(t =>
            t.UserId == userId &&
            t.Category == request.Category &&
            t.Name.ToLower() == normalizedName);

        if (exists)
        {
            throw new InvalidOperationException("A tag with this name already exists for this category.");
        }

        var tag = new Tag
        {
            Name = request.Name.Trim(),
            Category = request.Category,
            UserId = userId
        };

        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();

        return new TagDto(tag.Id, tag.Name, tag.Category, tag.CreatedAt);
    }

    public async Task<TagDto?> UpdateTagAsync(Guid id, UpdateTagRequest request, Guid userId)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag is null)
        {
            return null;
        }

        var nextName = string.IsNullOrWhiteSpace(request.Name) ? tag.Name : request.Name.Trim();
        var nextCategory = request.Category ?? tag.Category;
        var normalizedName = nextName.ToLowerInvariant();

        var exists = await _context.Tags.AnyAsync(t =>
            t.UserId == userId &&
            t.Id != id &&
            t.Category == nextCategory &&
            t.Name.ToLower() == normalizedName);

        if (exists)
        {
            throw new InvalidOperationException("A tag with this name already exists for this category.");
        }

        tag.Name = nextName;
        tag.Category = nextCategory;

        await _context.SaveChangesAsync();

        return new TagDto(tag.Id, tag.Name, tag.Category, tag.CreatedAt);
    }

    public async Task<bool> DeleteTagAsync(Guid id, Guid userId)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag is null)
        {
            return false;
        }

        _context.Tags.Remove(tag);
        await _context.SaveChangesAsync();
        return true;
    }
}