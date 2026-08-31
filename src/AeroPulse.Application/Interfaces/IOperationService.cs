using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Operasyon (turnaround) yönetimi için servis arayüzü.
/// Bir "operasyon", bir uçağın kapıya (gate) gelişinden ayrılışına kadar
/// tüm yer hizmetleri sürecini temsil eder.
/// </summary>
public interface IOperationService
{
    Task<ApiResponse<PagedResult<OperationDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? flightNumber = null, string? status = null);
    Task<ApiResponse<OperationDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<OperationDto>> CreateAsync(CreateOperationDto request);
    Task<ApiResponse<OperationDto>> UpdateAsync(Guid id, UpdateOperationDto request);
    Task<ApiResponse<bool>> DeleteAsync(Guid id);

    /// <summary>
    /// TRANSACTION: Operasyonu kapatır ve SLA kaydı yazar.
    /// İkisi de başarılı olursa commit, biri hata verirse rollback yapılır.
    /// </summary>
    Task<ApiResponse<SLARecordDto>> CloseWithSLAAsync(Guid id, CloseOperationDto request);

    /// <summary>
    /// Operasyon Sorumlusu'na özel checklist verilerini döndürür.
    /// </summary>
    Task<ApiResponse<OperationChecklistDto>> GetChecklistAsync(Guid id);

    /// <summary>
    /// Gecikme raporlarını döndürür.
    /// </summary>
    Task<ApiResponse<List<OperationDto>>> GetDelayedOperationsAsync();
}
