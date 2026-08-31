using System.Security.Claims;
using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AeroPulse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,MROEngineer")]
public class MaintenanceController : ControllerBase
{
    private readonly IMaintenanceService _maintenanceService;

    public MaintenanceController(IMaintenanceService maintenanceService)
    {
        _maintenanceService = maintenanceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] Guid? aircraftId = null)
    {
        var result = await _maintenanceService.GetAllAsync(page, pageSize, aircraftId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _maintenanceService.GetByIdAsync(id);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpGet("my-tasks")]
    [Authorize(Roles = "MROEngineer")]
    public async Task<IActionResult> GetMyTasks()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _maintenanceService.GetMyTasksAsync(userId.Value);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "MROEngineer")]
    public async Task<IActionResult> Create([FromBody] CreateMaintenanceRecordDto request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _maintenanceService.CreateAsync(userId.Value, request);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "MROEngineer")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMaintenanceRecordDto request)
    {
        var result = await _maintenanceService.UpdateAsync(id, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null) return null;
        return Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}
