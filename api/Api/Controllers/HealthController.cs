using Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            // Test database connection
            var canConnect = await _context.Database.CanConnectAsync();
            
            return Ok(new
            {
                status = canConnect ? "ok" : "degraded",
                timestamp = DateTime.UtcNow,
                database = canConnect ? "connected" : "disconnected"
            });
        }
        catch (Exception ex)
        {
            return Ok(new
            {
                status = "error",
                timestamp = DateTime.UtcNow,
                database = "disconnected",
                message = ex.Message
            });
        }
    }
}
