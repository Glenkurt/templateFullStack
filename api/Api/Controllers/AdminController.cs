using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Api.Models.DTOs;
using Api.Services;

namespace Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>
    /// Gets all users (Admin only)
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(List<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        var users = await _adminService.GetAllUsersAsync();
        return Ok(users);
    }

    /// <summary>
    /// Updates a user's role (Admin only)
    /// </summary>
    [HttpPatch("users/{userId}/role")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserRole(Guid userId, [FromBody] UpdateRoleRequest request)
    {
        var validRoles = new[] { "User", "Admin", "Owner" };
        if (!validRoles.Contains(request.Role))
        {
            return BadRequest(new { error = "Invalid role. Must be User, Admin, or Owner." });
        }

        var success = await _adminService.UpdateUserRoleAsync(userId, request.Role);
        if (!success)
        {
            return NotFound(new { error = "User not found" });
        }

        return NoContent();
    }

    /// <summary>
    /// Gets admin dashboard statistics (Admin only)
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminStatsDto>> GetStats()
    {
        var stats = await _adminService.GetStatsAsync();
        return Ok(stats);
    }
}
