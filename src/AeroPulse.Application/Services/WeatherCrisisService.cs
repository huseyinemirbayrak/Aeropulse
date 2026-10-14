using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Application.Services;

public class WeatherCrisisService : IWeatherCrisisService
{
    private readonly IAeroPulseDbContext _context;
    private readonly ICacheService _cache;
    private readonly IMessageBusService _messageBus;
    private readonly INotificationService _notificationService;
    private readonly IRealTimeNotifier? _realTimeNotifier;
    private readonly ILogger<WeatherCrisisService> _logger;

    private const string CRISIS_CACHE_KEY = "crisis:weather:wind:status";
    private static readonly TimeSpan CRISIS_STATUS_TTL = TimeSpan.FromHours(24);

    public WeatherCrisisService(
        IAeroPulseDbContext context,
        ICacheService cache,
        IMessageBusService messageBus,
        INotificationService notificationService,
        ILogger<WeatherCrisisService> logger,
        IRealTimeNotifier? realTimeNotifier = null)
    {
        _context = context;
        _cache = cache;
        _messageBus = messageBus;
        _notificationService = notificationService;
        _logger = logger;
        _realTimeNotifier = realTimeNotifier;
    }

    public async Task<ApiResponse<CrisisOperationResultDto>> TriggerWindCrisisAsync(
        string cityCode,
        double windSpeedKmH,
        double thresholdKmH = 80.0,
        string? reason = null)
    {
        var currentStatus = await _cache.GetAsync<CrisisStatusDto>(CRISIS_CACHE_KEY);

        if (currentStatus?.IsCrisisActive == true)
        {
            _logger.LogWarning(
                "High wind crisis state already engaged. Hub: {CityCode}, Velocity: {Speed:F1} km/h. Rate-limiting enforced.",
                cityCode, windSpeedKmH);

            return ApiResponse<CrisisOperationResultDto>.Ok(new CrisisOperationResultDto
            {
                IsCrisisActive = true,
                CityCode = cityCode,
                WindSpeedKmH = windSpeedKmH,
                ThresholdKmH = thresholdKmH,
                AffectedJetBridgesCount = currentStatus.DisabledJetBridgesCount,
                NotifiedUsersCount = 0,
                Message = $"Crisis condition active ({windSpeedKmH:F1} km/h). Telemetry notifications rate-limited.",
                Timestamp = DateTime.UtcNow
            });
        }

        _logger.LogCritical(
            "METEOROLOGICAL CRISIS ENGAGED: Hub: {CityCode} | Velocity: {Speed:F1} km/h (Threshold: {Threshold} km/h)",
            cityCode, windSpeedKmH, thresholdKmH);

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
            _logger.LogInformation("{Count} passenger boarding bridges transitioned to UnderMaintenance for ramp safety.", affectedCount);

            var terminals = bridges.Select(b => b.TerminalNo).Distinct();
            foreach (var terminal in terminals)
            {
                await _cache.RemoveAsync($"jetbridges:available:{terminal}");
            }
        }

        await _messageBus.PublishAsync("crisis.weather.windshear", new
        {
            EventType = "WindshearCrisisTriggered",
            CityCode = cityCode,
            WindSpeedKmH = Math.Round(windSpeedKmH, 1),
            ThresholdKmH = thresholdKmH,
            Timestamp = DateTime.UtcNow,
            AffectedJetBridgesCount = affectedCount,
            Reason = reason ?? "Wind velocity exceeded operational limits.",
            Action = "Airside passenger boarding bridges secured per aerodrome safety protocols."
        });

        var recipients = await _context.Users
            .Where(u => u.Role == UserRole.OperationsManager || u.Role == UserRole.Admin)
            .ToListAsync();

        var alertMessage = $"METEOROLOGICAL WARNING: {cityCode} wind velocity reached {windSpeedKmH:F1} km/h ({thresholdKmH} km/h exceeded). All passenger boarding bridges secured. {(string.IsNullOrWhiteSpace(reason) ? "" : "Details: " + reason)}".Trim();

        foreach (var user in recipients)
        {
            await _notificationService.CreateAsync(user.Id, alertMessage, NotificationType.General);
        }

        if (_realTimeNotifier != null)
        {
            await _realTimeNotifier.SendFlightAlertAsync(new FlightAlertEvent
            {
                FlightNumber = "AERODROME-CRISIS",
                AlertType = "WeatherCrisis",
                Message = $"METEOROLOGICAL WARNING: {cityCode} wind velocity reached {windSpeedKmH:F1} km/h. Passenger boarding bridges secured.",
                Severity = "Danger",
                OccurredAt = DateTime.UtcNow
            });

            await _realTimeNotifier.SendRawEventAsync("ReceiveWeatherAlert", new
            {
                isCrisisActive = true,
                cityCode = cityCode,
                windSpeedKmH = Math.Round(windSpeedKmH, 1),
                thresholdKmH = thresholdKmH,
                affectedJetBridgesCount = affectedCount,
                message = alertMessage,
                timestamp = DateTime.UtcNow
            });
        }

        _logger.LogInformation("Crisis alerts transmitted to {Count} authorized duty personnel.", recipients.Count);

        var newStatus = new CrisisStatusDto
        {
            IsCrisisActive = true,
            ActiveCrisisType = "Windshear (High Wind Velocity)",
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
            Message = "Meteorological crisis protocols engaged. Boarding bridges locked out and emergency notifications dispatched.",
            Timestamp = DateTime.UtcNow
        });
    }

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
                Message = "No active meteorological crisis found.",
                Timestamp = DateTime.UtcNow
            });
        }

        _logger.LogInformation(
            "METEOROLOGICAL CRISIS RESOLVED: {CityCode} | Wind velocity stabilized at {Speed:F1} km/h.",
            cityCode, windSpeedKmH);

        var restoredCount = 0;

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
                _logger.LogInformation("{Count} passenger boarding bridges restored to Available status.", restoredCount);

                var terminals = bridges.Select(b => b.TerminalNo).Distinct();
                foreach (var terminal in terminals)
                {
                    await _cache.RemoveAsync($"jetbridges:available:{terminal}");
                }
            }
        }

        await _messageBus.PublishAsync("crisis.weather.normal", new
        {
            EventType = "WindshearCrisisResolved",
            CityCode = cityCode,
            WindSpeedKmH = Math.Round(windSpeedKmH, 1),
            Timestamp = DateTime.UtcNow,
            RestoredJetBridgesCount = restoredCount,
            Message = "Wind velocity subsided below safety threshold. Normal aerodrome operations resumed."
        });

        var recipients = await _context.Users
            .Where(u => u.Role == UserRole.OperationsManager || u.Role == UserRole.Admin)
            .ToListAsync();

        var resolveMessage = $"METEOROLOGICAL CONDITIONS NORMALIZED: {cityCode} wind velocity stabilized at {windSpeedKmH:F1} km/h. {(restoreJetBridges ? "Passenger boarding bridges returned to service." : "Bridge status under ramp review.")}";

        foreach (var user in recipients)
        {
            await _notificationService.CreateAsync(user.Id, resolveMessage, NotificationType.General);
        }

        if (_realTimeNotifier != null)
        {
            await _realTimeNotifier.SendFlightAlertAsync(new FlightAlertEvent
            {
                FlightNumber = "AERODROME-CLEAR",
                AlertType = "WeatherResolved",
                Message = $"METEOROLOGICAL CLEARANCE: {cityCode} wind velocity stabilized at {windSpeedKmH:F1} km/h. Normal aerodrome operations resumed.",
                Severity = "Success",
                OccurredAt = DateTime.UtcNow
            });

            await _realTimeNotifier.SendRawEventAsync("ReceiveWeatherAlert", new
            {
                isCrisisActive = false,
                cityCode = cityCode,
                windSpeedKmH = Math.Round(windSpeedKmH, 1),
                thresholdKmH = currentStatus.ThresholdKmH,
                message = resolveMessage,
                timestamp = DateTime.UtcNow
            });
        }

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
            Message = "Meteorological crisis normalized. Normal operational state reinstated.",
            Timestamp = DateTime.UtcNow
        });
    }

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
