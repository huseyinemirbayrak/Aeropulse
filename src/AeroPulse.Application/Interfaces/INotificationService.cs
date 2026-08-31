using AeroPulse.Application.DTOs;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Kullanıcı bildirim yönetimi için servis arayüzü.
/// </summary>
public interface INotificationService
{
    Task<ApiResponse<List<NotificationDto>>> GetMyNotificationsAsync(Guid userId);
    Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId);
    Task<ApiResponse<bool>> MarkAsReadAsync(Guid notificationId, Guid userId);
    Task<ApiResponse<bool>> MarkAllAsReadAsync(Guid userId);
    Task<ApiResponse<NotificationDto>> CreateAsync(Guid recipientId, string message, NotificationType type, Guid? faultReportId = null);
}
