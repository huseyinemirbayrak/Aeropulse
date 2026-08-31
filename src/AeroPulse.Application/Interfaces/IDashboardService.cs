using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

public interface IDashboardService
{
    Task<ApiResponse<AdminDashboardDto>> GetAdminDashboardAsync();
    Task<ApiResponse<MRODashboardDto>> GetMRODashboardAsync(Guid engineerId);
}
