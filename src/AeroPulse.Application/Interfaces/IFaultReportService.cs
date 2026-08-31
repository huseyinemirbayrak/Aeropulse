using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Arıza talep (FaultReport) yönetimi için servis arayüzü.
/// Bir arıza, saha teknisyeni tarafından açılır ve bir mühendise atanır.
/// </summary>
public interface IFaultReportService
{
    Task<ApiResponse<PagedResult<FaultReportDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? status = null, Guid? aircraftId = null);
    Task<ApiResponse<FaultReportDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<FaultReportDto>> CreateAsync(CreateFaultReportDto request, Guid reportedByUserId);
    Task<ApiResponse<FaultReportDto>> UpdateAsync(Guid id, UpdateFaultReportDto request);
    Task<ApiResponse<bool>> DeleteAsync(Guid id);
    Task<ApiResponse<List<FaultReportDto>>> GetMyFaultsAsync(Guid technicianId);
    Task<ApiResponse<List<FaultReportDto>>> GetOverdueSLAAsync();
}
