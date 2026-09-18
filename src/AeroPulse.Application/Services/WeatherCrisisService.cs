using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Application.Services;

/// <summary>
/// Weather crisis management service.
/// Manages wind/windshear crises, shuts down jet bridges for safety,
/// sends emergency notifications, and publishes events to the message queue.
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

        // ===== SPAM PROTECTION =====
        // If crisis is already active, prevent repeated jet bridge shutdowns and notification spam
        if (currentStatus?.IsCrisisActive == true)
        {
            _logger.LogWarning(
                "⚠️ High wind crisis is already active! Location: {CityCode}, Wind: {Speed:F1} km/h. Spam protection applied.",
                cityCode, windSpeedKmH);

            return ApiResponse<CrisisOperationResultDto>.Ok(new CrisisOperationResultDto
            {
                IsCrisisActive = true,
                CityCode = cityCode,
                WindSpeedKmH = windSpeedKmH,
                ThresholdKmH = thresholdKmH,
                AffectedJetBridgesCount = currentStatus.DisabledJetBridgesCount,
                NotifiedUsersCount = 0,
                Message = $"Crisis is already active ({windSpeedKmH:F1} km/h). Excessive notifications prevented.",
                Timestamp = DateTime.UtcNow
            });
        }

        _logger.LogCritical(
            "🚨 WEATHER CRISIS TRIGGERED! Location: {CityCode} | Wind: {Speed:F1} km/h (Threshold: {Threshold} km/h)",
            cityCode, windSpeedKmH, thresholdKmH);

        // 1. Set Jet Bridges to "UnderMaintenance" (Out of Service) for Safety
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
            _logger.LogInformation("Total of {Count} jet bridges set to 'UnderMaintenance' for safety.", affectedCount);

            // Clear jet bridges cache
            var terminals = bridges.Select(b => b.TerminalNo).Distinct();
            foreach (var terminal in terminals)
            {
                await _cache.RemoveAsync($"jetbridges:available:{terminal}");
            }
        }

        // 2. Publish Emergency Event to Message Queue (Event Bus)
        await _messageBus.PublishAsync("crisis.weather.windshear", new
        {
            EventType = "WindshearCrisisTriggered",
            CityCode = cityCode,
            WindSpeedKmH = Math.Round(windSpeedKmH, 1),
            ThresholdKmH = thresholdKmH,
            Timestamp = DateTime.UtcNow,
            AffectedJetBridgesCount = affectedCount,
            Reason = reason ?? "Wind speed exceeded safety limit.",
            Action = "All jet bridges have been closed due to safety concerns."
        });

        // 3. Send Notifications to Authorized Users (OperationsManager & Admin)
        var recipients = await _context.Users
            .Where(u => u.Role == UserRole.OperationsManager || u.Role == UserRole.Admin)
            .ToListAsync();

        var alertMessage = $"🚨 CRITICAL WEATHER ALERT: {cityCode} wind speed reached {windSpeedKmH:F1} km/h ({thresholdKmH} km/h exceeded)! As per safety protocols, all jet bridges are out of service. {(string.IsNullOrWhiteSpace(reason) ? "" : "Detail: " + reason)}".Trim();

        foreach (var user in recipients)
        {
            await _notificationService.CreateAsync(user.Id, alertMessage, NotificationType.General);
        }

        _logger.LogInformation("Crisis notification sent to {Count} authorized users.", recipients.Count);

        // 4. Cache the Status
        var newStatus = new CrisisStatusDto
        {
            IsCrisisActive = true,
            ActiveCrisisType = "Windshear (High Wind)",
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
            Message = "Wind crisis successfully triggered. Jet bridges secured and emergency notifications sent.",
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
                Message = "No active weather crisis found.",
                Timestamp = DateTime.UtcNow
            });
        }

        _logger.LogInformation(
            "✅ WEATHER CRISIS ENDING: {CityCode} | Wind speed decreased to {Speed:F1} km/h.",
            cityCode, windSpeedKmH);

        var restoredCount = 0;

        // 1. Optionally restore jet bridges back to Available status
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
                _logger.LogInformation("Total of {Count} jet bridges restored to 'Available' status.", restoredCount);

                var terminals = bridges.Select(b => b.TerminalNo).Distinct();
                foreach (var terminal in terminals)
                {
                    await _cache.RemoveAsync($"jetbridges:available:{terminal}");
                }
            }
        }

        // 2. Publish Normalcy Event to Message Queue
        await _messageBus.PublishAsync("crisis.weather.normal", new
        {
            EventType = "WindshearCrisisResolved",
            CityCode = cityCode,
            WindSpeedKmH = Math.Round(windSpeedKmH, 1),
            Timestamp = DateTime.UtcNow,
            RestoredJetBridgesCount = restoredCount,
            Message = "Wind speed dropped to safety limits, weather crisis resolved."
        });

        // 3. Send Normalcy Notifications to Authorized Users
        var recipients = await _context.Users
            .Where(u => u.Role == UserRole.OperationsManager || u.Role == UserRole.Admin)
            .ToListAsync();

        var resolveMessage = $"✅ WEATHER CONDITIONS BACK TO NORMAL: {cityCode} wind speed decreased to {windSpeedKmH:F1} km/h. {(restoreJetBridges ? "Jet bridges are available for use." : "Jet bridge operations can be evaluated.")}";

        foreach (var user in recipients)
        {
            await _notificationService.CreateAsync(user.Id, resolveMessage, NotificationType.General);
        }

        // 4. Update Status in Cache
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
            Message = "Weather crisis successfully resolved. System returned to normal.",
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
                LastActionMessage = "No active crisis.",
                LastCheckedAt = DateTime.UtcNow
            };
        }

        return ApiResponse<CrisisStatusDto>.Ok(status);
    }
}
