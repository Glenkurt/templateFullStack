using Api.Models.DTOs;
using Api.Models.Entities;

namespace Api.Services;

public interface ITagService
{
    Task<List<TagDto>> GetTagsAsync(Guid userId, TagCategory? category);
    Task<TagDto?> GetTagByIdAsync(Guid id, Guid userId);
    Task<TagDto> CreateTagAsync(CreateTagRequest request, Guid userId);
    Task<TagDto?> UpdateTagAsync(Guid id, UpdateTagRequest request, Guid userId);
    Task<bool> DeleteTagAsync(Guid id, Guid userId);
}