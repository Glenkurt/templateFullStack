using Api.Models.DTOs;

namespace Api.Services;

public interface ICampaignService
{
    Task<List<CampaignDto>> GetCampaignsAsync(Guid userId);
    Task<CampaignDto?> GetCampaignByIdAsync(Guid id, Guid userId);
    Task<CampaignDto> CreateCampaignAsync(CreateCampaignRequest request, Guid userId);
    Task<CampaignDto?> UpdateCampaignAsync(Guid id, UpdateCampaignRequest request, Guid userId);
    Task<bool> DeleteCampaignAsync(Guid id, Guid userId);
}