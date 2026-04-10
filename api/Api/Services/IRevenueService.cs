using Api.Models.DTOs;

namespace Api.Services;

public interface IRevenueService
{
    Task<List<RevenueDto>> GetRevenuesAsync(Guid userId);
    Task<RevenueDto?> GetRevenueByIdAsync(Guid id, Guid userId);
    Task<RevenueDto> CreateRevenueAsync(CreateRevenueRequest request, Guid userId);
    Task<RevenueDto?> UpdateRevenueAsync(Guid id, UpdateRevenueRequest request, Guid userId);
    Task<bool> DeleteRevenueAsync(Guid id, Guid userId);
}