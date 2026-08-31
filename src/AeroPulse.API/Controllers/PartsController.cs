using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AeroPulse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,MROEngineer")]
public class PartsController : ControllerBase
{
    private readonly IPartService _partService;

    public PartsController(IPartService partService)
    {
        _partService = partService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, [FromQuery] Guid? aircraftId = null)
    {
        var result = await _partService.GetAllAsync(page, pageSize, search, aircraftId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _partService.GetByIdAsync(id);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePartDto request)
    {
        var result = await _partService.CreateAsync(request);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePartDto request)
    {
        var result = await _partService.UpdateAsync(id, request);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("critical-alerts")]
    public async Task<IActionResult> GetCriticalAlerts()
    {
        var result = await _partService.GetCriticalAlertsAsync();
        return Ok(result);
    }
}
