namespace Api.Models.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string Role,
    DateTime CreatedAt
);

public record UpdateRoleRequest(string Role);

public record AdminStatsDto(
    int TotalUsers,
    Dictionary<string, int> UsersByRole,
    int RecentSignups
);
