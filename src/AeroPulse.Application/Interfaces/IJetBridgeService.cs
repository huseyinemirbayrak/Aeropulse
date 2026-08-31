using AeroPulse.Application.DTOs;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Körük (Jet Bridge) ve atama yönetimi için servis arayüzü.
/// Çakışma kontrolü ve durum akışı buradan yönetilir.
/// </summary>
public interface IJetBridgeService
{
    // JetBridge CRUD
    Task<ApiResponse<List<JetBridgeDto>>> GetAllAsync(string? terminalNo = null);
    Task<ApiResponse<JetBridgeDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<JetBridgeDto>> CreateAsync(CreateJetBridgeDto request);
    Task<ApiResponse<JetBridgeDto>> UpdateAsync(Guid id, UpdateJetBridgeDto request);
    Task<ApiResponse<bool>> DeleteAsync(Guid id);

    // JetBridgeAssignment CRUD
    Task<ApiResponse<List<JetBridgeAssignmentDto>>> GetAllAssignmentsAsync(Guid? jetBridgeId = null);
    Task<ApiResponse<JetBridgeAssignmentDto>> GetAssignmentByIdAsync(Guid id);

    /// <summary>
    /// Yeni atama yapar. Çakışma kontrolü bu metot içinde yapılır.
    /// Çakışma varsa JetBridgeConflictResultDto.HasConflict = true döner ve
    /// alternatif köprüler listelenir.
    /// </summary>
    Task<ApiResponse<JetBridgeAssignmentDto>> CreateAssignmentAsync(CreateJetBridgeAssignmentDto request);

    /// <summary>
    /// Durum akışı: Planlandi → UcakIndi → KopruBagli → YolcuInisiTamamlandi → Serbest
    /// Her geçişte RabbitMQ'ya mesaj yayınlanır, Redis cache güncellenir.
    /// </summary>
    Task<ApiResponse<JetBridgeAssignmentDto>> UpdateAssignmentStatusAsync(Guid assignmentId, UpdateAssignmentStatusDto request);

    /// <summary>
    /// Belirli zaman aralığında çakışma var mı kontrol eder.
    /// Çakışma varsa alternatif köprüler önerilir.
    /// </summary>
    Task<JetBridgeConflictResultDto> CheckAvailabilityAsync(Guid jetBridgeId, DateTime start, DateTime end, Guid? excludeAssignmentId = null);

    /// <summary>
    /// Redis'ten boştaki köprüleri döner. Cache yoksa DB'den okur ve cache'ler.
    /// </summary>
    Task<ApiResponse<List<JetBridgeDto>>> GetAvailableBridgesAsync(string terminalNo);
}
