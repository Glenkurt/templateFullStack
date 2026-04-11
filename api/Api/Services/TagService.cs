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
        var name = RequireName(request.Name, nameof(request.Name));
        var normalizedName = name.ToLowerInvariant();
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
            Name = name,
            Category = request.Category,
            UserId = userId
        };

        _context.Tags.Add(tag);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("A tag with this name already exists for this category.");
        }

        return new TagDto(tag.Id, tag.Name, tag.Category, tag.CreatedAt);
    }

    public async Task<TagDto?> UpdateTagAsync(Guid id, UpdateTagRequest request, Guid userId)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag is null)
        {
            return null;
        }

        var nextName = request.Name is null ? tag.Name : RequireName(request.Name, nameof(request.Name));
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

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new InvalidOperationException("A tag with this name already exists for this category.");
        }

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

    private static string RequireName(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"{fieldName} is required.", fieldName);
        }

        return value.Trim();
    }
}