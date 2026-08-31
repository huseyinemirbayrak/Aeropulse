using System.Security.Claims;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AeroPulse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminDashboard()
    {
        var result = await _dashboardService.GetAdminDashboardAsync();
        return Ok(result);
    }

    [HttpGet("mro")]
    [Authorize(Roles = "MROEngineer")]
    public async Task<IActionResult> GetMRODashboard()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _dashboardService.GetMRODashboardAsync(userId.Value);
        return Ok(result);
    }

    [HttpGet("viewer")]
    [Authorize(Roles = "Admin,Viewer")]
    public async Task<IActionResult> GetViewerDashboard()
    {
        // Viewer sees the same data as admin dashboard but read-only
        var result = await _dashboardService.GetAdminDashboardAsync();
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null) return null;
        return Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}
