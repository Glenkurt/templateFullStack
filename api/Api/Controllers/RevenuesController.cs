using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Api.Models.DTOs;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/revenues")]
public class RevenuesController : ControllerBase
{
    private readonly IRevenueService _revenueService;

    public RevenuesController(IRevenueService revenueService)
    {
        _revenueService = revenueService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<RevenueDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<RevenueDto>>> GetRevenues()
    {
        var userId = GetUserId();
        var revenues = await _revenueService.GetRevenuesAsync(userId);
        return Ok(revenues);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RevenueDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RevenueDto>> GetRevenueById(Guid id)
    {
        var userId = GetUserId();
        var revenue = await _revenueService.GetRevenueByIdAsync(id, userId);
        if (revenue is null)
        {
            return NotFound();
        }

        return Ok(revenue);
    }

    [HttpPost]
    [ProducesResponseType(typeof(RevenueDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RevenueDto>> CreateRevenue([FromBody] CreateRevenueRequest request)
    {
        try
        {
            var userId = GetUserId();
            var created = await _revenueService.CreateRevenueAsync(request, userId);
            return CreatedAtAction(nameof(GetRevenueById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Invalid revenue",
                Detail = ex.Message
            });
        }
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(RevenueDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RevenueDto>> UpdateRevenue(Guid id, [FromBody] UpdateRevenueRequest request)
    {
        try
        {
            var userId = GetUserId();
            var updated = await _revenueService.UpdateRevenueAsync(id, request, userId);
            if (updated is null)
            {
                return NotFound();
            }

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Invalid revenue",
                Detail = ex.Message
            });
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRevenue(Guid id)
    {
        var userId = GetUserId();
        var deleted = await _revenueService.DeleteRevenueAsync(id, userId);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}