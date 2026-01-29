using Api.Models.DTOs;

namespace Api.Services;

public interface IAdminService
{
    Task<List<UserDto>> GetAllUsersAsync();
    Task<bool> UpdateUserRoleAsync(Guid userId, string role);
    Task<AdminStatsDto> GetStatsAsync();
}
