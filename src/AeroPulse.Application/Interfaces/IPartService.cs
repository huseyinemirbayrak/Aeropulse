using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

public interface IPartService
{
    Task<ApiResponse<PagedResult<PartDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? search = null, Guid? aircraftId = null);
    Task<ApiResponse<PartDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<PartDto>> CreateAsync(CreatePartDto request);
    Task<ApiResponse<PartDto>> UpdateAsync(Guid id, UpdatePartDto request);
    Task<ApiResponse<List<PartDto>>> GetCriticalAlertsAsync();
}
