using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

/// <summary>
/// Kullanıcı bildirim servisi.
/// Bildirimler hem DB'ye kaydedilir (kalıcı) hem de Redis'te okunmamış sayısı cache'lenir.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IAeroPulseDbContext _context;
    private readonly ICacheService _cache;

    private const string UNREAD_COUNT_KEY = "notifications:unread:{0}"; // {0} = userId

    public NotificationService(IAeroPulseDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<ApiResponse<List<NotificationDto>>> GetMyNotificationsAsync(Guid userId)
    {
        var notifications = await _context.Notifications
            .Include(n => n.RecipientUser)
            .Where(n => n.RecipientUserId == userId)
            .OrderByDescending(n => n.Date)
            .Take(50) // Son 50 bildirim
            .ToListAsync();

        return ApiResponse<List<NotificationDto>>.Ok(notifications.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId)
    {
        var cacheKey = string.Format(UNREAD_COUNT_KEY, userId);
        var cached = await _cache.GetAsync<int?>(cacheKey);
        if (cached.HasValue)
            return ApiResponse<int>.Ok(cached.Value);

        var count = await _context.Notifications
            .CountAsync(n => n.RecipientUserId == userId && !n.IsRead);

        await _cache.SetAsync(cacheKey, count, TimeSpan.FromMinutes(5));
        return ApiResponse<int>.Ok(count);
    }

    public async Task<ApiResponse<bool>> MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientUserId == userId);

        if (notification == null)
            return ApiResponse<bool>.Fail("Bildirim bulunamadı.");

        notification.IsRead = true;
        notification.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Cache'i temizle
        await _cache.RemoveAsync(string.Format(UNREAD_COUNT_KEY, userId));
        return ApiResponse<bool>.Ok(true, "Bildirim okundu olarak işaretlendi.");
    }

    public async Task<ApiResponse<bool>> MarkAllAsReadAsync(Guid userId)
    {
        var unread = await _context.Notifications
            .Where(n => n.RecipientUserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        await _cache.RemoveAsync(string.Format(UNREAD_COUNT_KEY, userId));
        return ApiResponse<bool>.Ok(true, $"{unread.Count} bildirim okundu olarak işaretlendi.");
    }

    public async Task<ApiResponse<NotificationDto>> CreateAsync(Guid recipientId, string message, NotificationType type, Guid? faultReportId = null)
    {
        // Alıcı kullanıcı yoksa (örn: Guid.Empty) bildirim oluşturma
        if (recipientId == Guid.Empty)
            return ApiResponse<NotificationDto>.Fail("Geçersiz alıcı.");

        var notification = new Notification
        {
            RecipientUserId = recipientId,
            Message = message,
            NotificationType = type,
            FaultReportId = faultReportId,
            IsRead = false,
            Date = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Okunmamış sayı cache'ini geçersiz kıl
        await _cache.RemoveAsync(string.Format(UNREAD_COUNT_KEY, recipientId));

        return ApiResponse<NotificationDto>.Ok(new NotificationDto
        {
            Id = notification.Id,
            RecipientUserId = notification.RecipientUserId,
            FaultReportId = notification.FaultReportId,
            Message = notification.Message,
            NotificationType = notification.NotificationType,
            IsRead = notification.IsRead,
            Date = notification.Date
        });
    }

    private static NotificationDto MapToDto(Notification n) => new()
    {
        Id = n.Id,
        RecipientUserId = n.RecipientUserId,
        RecipientName = n.RecipientUser?.FullName ?? "—",
        FaultReportId = n.FaultReportId,
        Message = n.Message,
        NotificationType = n.NotificationType,
        IsRead = n.IsRead,
        Date = n.Date
    };
}
