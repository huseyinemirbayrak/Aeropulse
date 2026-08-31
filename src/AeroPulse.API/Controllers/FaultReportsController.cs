using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AeroPulse.API.Controllers;

/// <summary>
/// Arıza talep yönetimi API controller'ı.
/// 
/// Endpoint'ler:
///   GET    /api/fault-reports            — Tüm arıza raporları
///   GET    /api/fault-reports/{id}       — Tek arıza detayı
///   POST   /api/fault-reports            — Yeni arıza aç (saha teknisyeni)
///   PUT    /api/fault-reports/{id}       — Arıza güncelle (mühendis)
///   DELETE /api/fault-reports/{id}       — Sil (admin)
///   GET    /api/fault-reports/my-faults  — Benim açtığım arızalar
///   GET    /api/fault-reports/overdue    — SLA süresi dolmuş arızalar
/// </summary>
[ApiController]
[Route("api/fault-reports")]
[Authorize]
public class FaultReportsController : ControllerBase
{
    private readonly IFaultReportService _service;

    public FaultReportsController(IFaultReportService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,OperationsManager,MROEngineer")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] Guid? aircraftId = null)
    {
        var result = await _service.GetAllAsync(page, pageSize, status, aircraftId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,OperationsManager,MROEngineer,FieldTechnician")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FieldTechnician,MROEngineer")]
    public async Task<IActionResult> Create([FromBody] CreateFaultReportDto request)
    {
        // JWT'den kullanıcı kimliğini al
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized(ApiResponse<object>.Fail("Kullanıcı kimliği alınamadı."));

        var result = await _service.CreateAsync(request, userId);
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,MROEngineer,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFaultReportDto request)
    {
        var result = await _service.UpdateAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Saha teknisyeni kendi açtığı arızaları görür.
    /// </summary>
    [HttpGet("my-faults")]
    [Authorize(Roles = "FieldTechnician,MROEngineer,Admin")]
    public async Task<IActionResult> GetMyFaults()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized(ApiResponse<object>.Fail("Kullanıcı kimliği alınamadı."));

        var result = await _service.GetMyFaultsAsync(userId);
        return Ok(result);
    }

    /// <summary>
    /// SLA süresi geçmiş arızalar — yöneticiler için kritik liste.
    /// </summary>
    [HttpGet("overdue")]
    [Authorize(Roles = "Admin,OperationsManager,MROEngineer")]
    public async Task<IActionResult> GetOverdue()
    {
        var result = await _service.GetOverdueSLAAsync();
        return Ok(result);
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var id) ? id : Guid.Empty;
    }
}
