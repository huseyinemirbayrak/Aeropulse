using System;
using System.Linq;
using System.Threading.Tasks;
using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Application.Services;

public class FlightEventProcessorService : IFlightEventProcessorService
{
    private readonly IMaintenanceService _maintenanceService;
    private readonly IFaultReportService _faultReportService;
    private readonly IJetBridgeService _jetBridgeService;
    private readonly ILogger<FlightEventProcessorService> _logger;

    public FlightEventProcessorService(
        IMaintenanceService maintenanceService,
        IFaultReportService faultReportService,
        IJetBridgeService jetBridgeService,
        ILogger<FlightEventProcessorService> logger)
    {
        _maintenanceService = maintenanceService;
        _faultReportService = faultReportService;
        _jetBridgeService = jetBridgeService;
        _logger = logger;
    }

    public async Task ProcessFlightDelayAsync(FlightDelayDto delayDto)
    {
        _logger.LogInformation("Processing flight delay telemetry for Aircraft {AircraftId}. Magnitude: {DelayMinutes} minutes.", delayDto.AircraftId, delayDto.DelayMinutes);

        if (!Guid.TryParse(delayDto.AircraftId, out var aircraftGuid))
        {
            _logger.LogWarning("Invalid AircraftId format encountered: {AircraftId}", delayDto.AircraftId);
            return;
        }

        bool slaRiskDetected = false;
        string riskMessage = "";

        var maintenanceResponse = await _maintenanceService.GetAllAsync(1, 100, aircraftGuid);
        if (maintenanceResponse.Success && maintenanceResponse.Data != null)
        {
            var upcomingMaintenances = maintenanceResponse.Data.Items
                .Where(m => m.NextScheduledDate.HasValue || m.Date.Date >= DateTime.Today)
                .ToList();

            if (upcomingMaintenances.Any() && delayDto.DelayMinutes >= 180)
            {
                slaRiskDetected = true;
                riskMessage += "Scheduled maintenance window breached! ";
            }
        }

        var bridgeResponse = await _jetBridgeService.GetAllAssignmentsAsync();
        if (bridgeResponse.Success && bridgeResponse.Data != null)
        {
            var upcomingBridges = bridgeResponse.Data
                .Where(a => a.AircraftId == aircraftGuid && a.Status == JetBridgeAssignmentStatus.Planned)
                .ToList();

            if (upcomingBridges.Any() && delayDto.DelayMinutes >= 60) 
            {
                slaRiskDetected = true;
                riskMessage += $"Jet bridge reservation slot (Bridge {upcomingBridges.First().BridgeNo}) at risk of conflict! ";
            }
        }

        if (slaRiskDetected)
        {
            _logger.LogWarning("SLA Risk Alert: Aircraft {AircraftId} - {RiskMessage}", delayDto.AircraftId, riskMessage);

            var report = new CreateFaultReportDto
            {
                AircraftId = aircraftGuid,
                Priority = Priority.High,
                Description = $"Operational SLA Risk Alert: Aircraft {delayDto.AircraftId} - {riskMessage}(Rotation delay: {delayDto.DelayMinutes} min)"
            };

            await _faultReportService.CreateAsync(report, Guid.Empty);
        }
    }
}
