using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AeroPulse.API.Controllers;

/// <summary>
/// Körük (Jet Bridge) ve atama yönetimi API controller'ı.
/// 
/// Endpoint'ler:
///   GET    /api/jet-bridges                              — Terminal'e göre körükler
///   GET    /api/jet-bridges/{id}                         — Tek körük detayı
///   POST   /api/jet-bridges                              — Yeni körük ekle
///   PUT    /api/jet-bridges/{id}                         — Körük güncelle
///   DELETE /api/jet-bridges/{id}                         — Körük sil
///   GET    /api/jet-bridges/available                    — Boş körükler (Redis cache)
///   GET    /api/jet-bridges/assignments                  — Tüm atamalar
///   POST   /api/jet-bridges/assignments                  — Yeni atama (ÇAKIŞMA KONTROLÜ)
///   PUT    /api/jet-bridges/assignments/{id}/status      — Durum güncelle (akış)
///   GET    /api/jet-bridges/check-availability           — Belirli zaman müsait mi?
/// </summary>
[ApiController]
[Route("api/jet-bridges")]
[Authorize]
public class JetBridgesController : ControllerBase
{
    private readonly IJetBridgeService _service;

    public JetBridgesController(IJetBridgeService service)
    {
        _service = service;
    }

    // ============== JET BRIDGE ENDPOINTS ==============

    [HttpGet]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician")]
    public async Task<IActionResult> GetAll([FromQuery] string? terminalNo = null)
    {
        var result = await _service.GetAllAsync(terminalNo);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateJetBridgeDto request)
    {
        var result = await _service.CreateAsync(request);
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJetBridgeDto request)
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
    /// Belirli bir terminaldeki boş körükler (Redis cache'ten).
    /// Her istekte DB'ye gitmez — 2 dakika boyunca cache'den gelir.
    /// </summary>
    [HttpGet("available")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer")]
    public async Task<IActionResult> GetAvailable([FromQuery] string terminalNo = "T1")
    {
        var result = await _service.GetAvailableBridgesAsync(terminalNo);
        return Ok(result);
    }

    // ============== ASSIGNMENT ENDPOINTS ==============

    [HttpGet("assignments")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer")]
    public async Task<IActionResult> GetAllAssignments([FromQuery] Guid? jetBridgeId = null)
    {
        var result = await _service.GetAllAssignmentsAsync(jetBridgeId);
        return Ok(result);
    }

    [HttpGet("assignments/{id}")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician")]
    public async Task<IActionResult> GetAssignmentById(Guid id)
    {
        var result = await _service.GetAssignmentByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// YENİ ATAMA — ÇAKIŞMA KONTROLÜ BURADA YAPILIR.
    /// 
    /// Çakışma yoksa: 201 Created + atama bilgisi
    /// Çakışma varsa: 409 Conflict + alternatif köprü önerisi
    /// </summary>
    [HttpPost("assignments")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateJetBridgeAssignmentDto request)
    {
        // Önce çakışma kontrolü yap — sonucu döndür
        var conflict = await _service.CheckAvailabilityAsync(
            request.JetBridgeId,
            request.EstimatedArrivalTime,
            request.EstimatedDepartureTime
        );

        if (conflict.HasConflict)
        {
            // 409 Conflict döndür ve alternatif önerileri ekle
            return Conflict(new
            {
                Success = false,
                Message = conflict.Message,
                ConflictingAssignment = conflict.ConflictingAssignment,
                AlternativeBridges = conflict.AlternativeBridges
            });
        }

        var result = await _service.CreateAssignmentAsync(request);
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetAssignmentById), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Durum akışı endpoint'i.
    /// Planned → AircraftLanded → BridgeConnected → DisembarkingComplete → Released
    /// Her geçişte RabbitMQ + Redis güncellenir.
    /// </summary>
    [HttpPut("assignments/{id}/status")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> UpdateAssignmentStatus(Guid id, [FromBody] UpdateAssignmentStatusDto request)
    {
        var result = await _service.UpdateAssignmentStatusAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Belirli bir körük + zaman aralığı için müsaitlik kontrolü.
    /// Çakışma varsa alternatif köprüler de döner.
    /// </summary>
    [HttpGet("{id}/check-availability")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> CheckAvailability(
        Guid id,
        [FromQuery] DateTime start,
        [FromQuery] DateTime end)
    {
        var result = await _service.CheckAvailabilityAsync(id, start, end);
        if (result.HasConflict)
            return Conflict(result);
        return Ok(result);
    }
}
