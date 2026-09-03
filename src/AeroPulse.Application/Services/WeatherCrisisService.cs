using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Application.Services;

/// <summary>
/// Hava durumu kriz yönetimi servisi.
/// Rüzgâr / Windshear krizlerini yönetir, körükleri emniyet amacıyla kapatır,
/// acil bildirimler gönderir ve mesaj kuyruğuna olay fırlatır.
/// </summary>
public class WeatherCrisisService : IWeatherCrisisService
{
    private readonly IAeroPulseDbContext _context;
    private readonly ICacheService _cache;
    private readonly IMessageBusService _messageBus;
    private readonly INotificationService _notificationService;
    private readonly ILogger<WeatherCrisisService> _logger;

    private const string CRISIS_CACHE_KEY = "crisis:weather:wind:status";
    private static readonly TimeSpan CRISIS_STATUS_TTL = TimeSpan.FromHours(24);

    public WeatherCrisisService(
        IAeroPulseDbContext context,
        ICacheService cache,
        IMessageBusService messageBus,
        INotificationService notificationService,
        ILogger<WeatherCrisisService> logger)
    {
        _context = context;
        _cache = cache;
        _messageBus = messageBus;
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ApiResponse<CrisisOperationResultDto>> TriggerWindCrisisAsync(
        string cityCode,
        double windSpeedKmH,
        double thresholdKmH = 80.0,
        string? reason = null)
    {
        var currentStatus = await _cache.GetAsync<CrisisStatusDto>(CRISIS_CACHE_KEY);

        // ===== SPAM KORUMASI =====
        // Kriz zaten aktifse tekrar tekrar körükleri kapatma ve bildirim spam'i yapma
        if (currentStatus?.IsCrisisActive == true)
        {
            _logger.LogWarning(
                "⚠️ Yüksek rüzgâr krizi zaten aktif durumda! Lokasyon: {CityCode}, Rüzgâr: {Speed:F1} km/s. Spam koruması uygulandı.",
                cityCode, windSpeedKmH);

            return ApiResponse<CrisisOperationResultDto>.Ok(new CrisisOperationResultDto
            {
                IsCrisisActive = true,
                CityCode = cityCode,
                WindSpeedKmH = windSpeedKmH,
                ThresholdKmH = thresholdKmH,
                AffectedJetBridgesCount = currentStatus.DisabledJetBridgesCount,
                NotifiedUsersCount = 0,
                Message = $"Kriz zaten aktif durumda ({windSpeedKmH:F1} km/s). Aşırı bildirim engellendi.",
                Timestamp = DateTime.UtcNow
            });
        }

        _logger.LogCritical(
            "🚨 HAVA KRİZİ TETİKLENİYOR! Lokasyon: {CityCode} | Rüzgâr: {Speed:F1} km/s (Limit: {Threshold} km/s)",
            cityCode, windSpeedKmH, thresholdKmH);

        // 1. Körükleri Emniyet Amacıyla "UnderMaintenance" (Kullanım Dışı) Yap
        var bridges = await _context.JetBridges.ToListAsync();
        var affectedCount = 0;

        foreach (var bridge in bridges)
        {
            if (bridge.StatusCode != JetBridgeStatus.UnderMaintenance)
            {
                bridge.StatusCode = JetBridgeStatus.UnderMaintenance;
                bridge.UpdatedAt = DateTime.UtcNow;
                affectedCount++;
            }
        }

        if (affectedCount > 0)
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Toplam {Count} körük emniyet amacıyla 'UnderMaintenance' durumuna alındı.", affectedCount);

            // Körüklerin önbelleğini (cache) temizle
            var terminals = bridges.Select(b => b.TerminalNo).Distinct();
            foreach (var terminal in terminals)
            {
                await _cache.RemoveAsync($"jetbridges:available:{terminal}");
            }
        }

        // 2. Mesaj Kuyruğuna (RabbitMQ) Acil Durum Olayı Yayınla
        await _messageBus.PublishAsync("crisis.weather.windshear", new
        {
            EventType = "WindshearCrisisTriggered",
            CityCode = cityCode,
            WindSpeedKmH = Math.Round(windSpeedKmH, 1),
            ThresholdKmH = thresholdKmH,
            Timestamp = DateTime.UtcNow,
            AffectedJetBridgesCount = affectedCount,
            Reason = reason ?? "Rüzgâr hızı emniyet limitini aştı.",
            Action = "Tüm körükler emniyet gerekçesiyle kapatıldı."
        });

        // 3. Yetkili Kullanıcılara (OperationsManager & Admin) Bildirim Gönder
        var recipients = await _context.Users
            .Where(u => u.Role == UserRole.OperationsManager || u.Role == UserRole.Admin)
            .ToListAsync();

        var alertMessage = $"🚨 KRİTİK HAVA UYARISI: {cityCode} rüzgâr hızı {windSpeedKmH:F1} km/s seviyesine ulaştı ({thresholdKmH} km/s aşıldı)! Emniyet protokolü gereği tüm körükler kullanıma kapatıldı. {(string.IsNullOrWhiteSpace(reason) ? "" : "Detay: " + reason)}".Trim();

        foreach (var user in recipients)
        {
            await _notificationService.CreateAsync(user.Id, alertMessage, NotificationType.General);
        }

        _logger.LogInformation("Kriz bildirimi {Count} yetkili kullanıcıya iletildi.", recipients.Count);

        // 4. Durumu Önbelleğe Kaydet
        var newStatus = new CrisisStatusDto
        {
            IsCrisisActive = true,
            ActiveCrisisType = "Windshear (Yüksek Rüzgâr)",
            CityCode = cityCode,
            CurrentWindSpeedKmH = windSpeedKmH,
            ThresholdKmH = thresholdKmH,
            StartedAt = DateTime.UtcNow,
            ResolvedAt = null,
            DisabledJetBridgesCount = bridges.Count(b => b.StatusCode == JetBridgeStatus.UnderMaintenance),
            LastActionMessage = alertMessage,
            LastCheckedAt = DateTime.UtcNow
        };
        await _cache.SetAsync(CRISIS_CACHE_KEY, newStatus, CRISIS_STATUS_TTL);

        return ApiResponse<CrisisOperationResultDto>.Ok(new CrisisOperationResultDto
        {
            IsCrisisActive = true,
            CityCode = cityCode,
            WindSpeedKmH = windSpeedKmH,
            ThresholdKmH = thresholdKmH,
            AffectedJetBridgesCount = affectedCount,
            NotifiedUsersCount = recipients.Count,
            Message = "Rüzgâr krizi başarıyla tetiklendi. Körükler emniyet durumuna çekildi ve acil bildirimler gönderildi.",
            Timestamp = DateTime.UtcNow
        });
    }

    /// <inheritdoc />
    public async Task<ApiResponse<CrisisOperationResultDto>> ResolveWindCrisisAsync(
        string cityCode,
        double windSpeedKmH,
        bool restoreJetBridges = true)
    {
        var currentStatus = await _cache.GetAsync<CrisisStatusDto>(CRISIS_CACHE_KEY);

        if (currentStatus == null || !currentStatus.IsCrisisActive)
        {
            return ApiResponse<CrisisOperationResultDto>.Ok(new CrisisOperationResultDto
            {
                IsCrisisActive = false,
                CityCode = cityCode,
                WindSpeedKmH = windSpeedKmH,
                ThresholdKmH = currentStatus?.ThresholdKmH ?? 80.0,
                AffectedJetBridgesCount = 0,
                NotifiedUsersCount = 0,
                Message = "Zaten aktif bir hava krizi bulunmuyor.",
                Timestamp = DateTime.UtcNow
            });
        }

        _logger.LogInformation(
            "✅ HAVA KRİZİ SONA ERİYOR: {CityCode} | Rüzgâr hızı {Speed:F1} km/s seviyesine geriledi.",
            cityCode, windSpeedKmH);

        var restoredCount = 0;

        // 1. İsteğe bağlı olarak körükleri tekrar Available durumuna çek
        if (restoreJetBridges)
        {
            var bridges = await _context.JetBridges
                .Where(b => b.StatusCode == JetBridgeStatus.UnderMaintenance)
                .ToListAsync();

            foreach (var bridge in bridges)
            {
                bridge.StatusCode = JetBridgeStatus.Available;
                bridge.UpdatedAt = DateTime.UtcNow;
                restoredCount++;
            }

            if (restoredCount > 0)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Toplam {Count} körük yeniden 'Available' durumuna getirildi.", restoredCount);

                var terminals = bridges.Select(b => b.TerminalNo).Distinct();
                foreach (var terminal in terminals)
                {
                    await _cache.RemoveAsync($"jetbridges:available:{terminal}");
                }
            }
        }

        // 2. Mesaj Kuyruğuna Normale Dönüş Olayı Yayınla
        await _messageBus.PublishAsync("crisis.weather.normal", new
        {
            EventType = "WindshearCrisisResolved",
            CityCode = cityCode,
            WindSpeedKmH = Math.Round(windSpeedKmH, 1),
            Timestamp = DateTime.UtcNow,
            RestoredJetBridgesCount = restoredCount,
            Message = "Rüzgâr hızı emniyetli seviyeye geriledi, hava krizi çözüldü."
        });

        // 3. Yetkili Kullanıcılara Normale Dönüş Bildirimi Gönder
        var recipients = await _context.Users
            .Where(u => u.Role == UserRole.OperationsManager || u.Role == UserRole.Admin)
            .ToListAsync();

        var resolveMessage = $"✅ HAVA KOŞULLARI NORMALE DÖNDÜ: {cityCode} rüzgâr hızı {windSpeedKmH:F1} km/s seviyesine geriledi. {(restoreJetBridges ? "Körükler yeniden kullanıma açıldı." : "Körük operasyonları incelenebilir.")}";

        foreach (var user in recipients)
        {
            await _notificationService.CreateAsync(user.Id, resolveMessage, NotificationType.General);
        }

        // 4. Önbellekteki Durumu Güncelle
        var updatedStatus = new CrisisStatusDto
        {
            IsCrisisActive = false,
            ActiveCrisisType = null,
            CityCode = cityCode,
            CurrentWindSpeedKmH = windSpeedKmH,
            ThresholdKmH = currentStatus.ThresholdKmH,
            StartedAt = currentStatus.StartedAt,
            ResolvedAt = DateTime.UtcNow,
            DisabledJetBridgesCount = 0,
            LastActionMessage = resolveMessage,
            LastCheckedAt = DateTime.UtcNow
        };
        await _cache.SetAsync(CRISIS_CACHE_KEY, updatedStatus, CRISIS_STATUS_TTL);

        return ApiResponse<CrisisOperationResultDto>.Ok(new CrisisOperationResultDto
        {
            IsCrisisActive = false,
            CityCode = cityCode,
            WindSpeedKmH = windSpeedKmH,
            ThresholdKmH = currentStatus.ThresholdKmH,
            AffectedJetBridgesCount = restoredCount,
            NotifiedUsersCount = recipients.Count,
            Message = "Hava durumu krizi başarıyla sonlandırıldı. Sistem normale döndü.",
            Timestamp = DateTime.UtcNow
        });
    }

    /// <inheritdoc />
    public async Task<ApiResponse<CrisisStatusDto>> GetCrisisStatusAsync()
    {
        var status = await _cache.GetAsync<CrisisStatusDto>(CRISIS_CACHE_KEY);

        if (status == null)
        {
            var disabledBridgesCount = await _context.JetBridges
                .CountAsync(b => b.StatusCode == JetBridgeStatus.UnderMaintenance);

            status = new CrisisStatusDto
            {
                IsCrisisActive = false,
                CityCode = "LTFM",
                CurrentWindSpeedKmH = 0,
                ThresholdKmH = 80.0,
                DisabledJetBridgesCount = disabledBridgesCount,
                LastActionMessage = "Aktif bir kriz bulunmuyor.",
                LastCheckedAt = DateTime.UtcNow
            };
        }

        return ApiResponse<CrisisStatusDto>.Ok(status);
    }
}
