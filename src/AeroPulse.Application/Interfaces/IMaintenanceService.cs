using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

public interface IMaintenanceService
{
    Task<ApiResponse<PagedResult<MaintenanceRecordDto>>> GetAllAsync(int page = 1, int pageSize = 20, Guid? aircraftId = null);
    Task<ApiResponse<MaintenanceRecordDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<List<MaintenanceRecordDto>>> GetMyTasksAsync(Guid engineerId);
    Task<ApiResponse<MaintenanceRecordDto>> CreateAsync(Guid engineerId, CreateMaintenanceRecordDto request);
    Task<ApiResponse<MaintenanceRecordDto>> UpdateAsync(Guid id, UpdateMaintenanceRecordDto request);
}
