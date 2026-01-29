using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models.DTOs;

namespace Api.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .Select(u => new UserDto(
                u.Id,
                u.Email,
                u.Role,
                u.CreatedAt
            ))
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> UpdateUserRoleAsync(Guid userId, string role)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.Role = role;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AdminStatsDto> GetStatsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var usersByRole = await _context.Users
            .GroupBy(u => u.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Role, x => x.Count);

        var recentSignups = await _context.Users
            .Where(u => u.CreatedAt >= DateTime.UtcNow.AddDays(-7))
            .CountAsync();

        return new AdminStatsDto(
            totalUsers,
            usersByRole,
            recentSignups
        );
    }
}
