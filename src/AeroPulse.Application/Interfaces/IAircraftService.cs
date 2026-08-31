using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

public interface IAircraftService
{
    Task<ApiResponse<PagedResult<AircraftDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? search = null);
    Task<ApiResponse<AircraftDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<AircraftDto>> CreateAsync(CreateAircraftDto request);
    Task<ApiResponse<AircraftDto>> UpdateAsync(Guid id, UpdateAircraftDto request);
    Task<ApiResponse<bool>> DeleteAsync(Guid id);
}
