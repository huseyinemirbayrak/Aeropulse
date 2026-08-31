using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AeroPulse.API.Controllers;

/// <summary>
/// Yer hizmetleri operasyon yönetimi API controller'ı.
/// 
/// Endpoint'ler:
///   GET    /api/operations               — Tüm operasyonları listele
///   GET    /api/operations/{id}          — Tek operasyon detayı
///   POST   /api/operations               — Yeni operasyon oluştur
///   PUT    /api/operations/{id}          — Operasyon güncelle
///   DELETE /api/operations/{id}          — Operasyon sil
///   POST   /api/operations/{id}/close    — Operasyonu kapat + SLA kaydı yaz (TRANSACTION)
///   GET    /api/operations/{id}/checklist — Operasyon checklist'i
///   GET    /api/operations/delayed       — Gecikmiş operasyonlar
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OperationsController : ControllerBase
{
    private readonly IOperationService _service;

    public OperationsController(IOperationService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,OperationsManager,Viewer")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? flightNumber = null,
        [FromQuery] string? status = null)
    {
        var result = await _service.GetAllAsync(page, pageSize, flightNumber, status);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> Create([FromBody] CreateOperationDto request)
    {
        var result = await _service.CreateAsync(request);
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOperationDto request)
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
    /// TRANSACTION ENDPOINT: Operasyonu kapat ve SLA kaydını aynı anda yaz.
    /// Eğer SLA kaydı yazılırken hata olursa operasyon da geri alınır.
    /// </summary>
    [HttpPost("{id}/close")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> CloseWithSLA(Guid id, [FromBody] CloseOperationDto request)
    {
        var result = await _service.CloseWithSLAAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Operasyon Sorumlusu'na özel checklist — hangi adımlar tamamlandı?
    /// </summary>
    [HttpGet("{id}/checklist")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> GetChecklist(Guid id)
    {
        var result = await _service.GetChecklistAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Gecikmiş operasyonları listele.
    /// </summary>
    [HttpGet("delayed")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> GetDelayed()
    {
        var result = await _service.GetDelayedOperationsAsync();
        return Ok(result);
    }
}
