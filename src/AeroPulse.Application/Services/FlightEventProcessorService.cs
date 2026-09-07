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
        _logger.LogInformation("Processing flight delay for Aircraft {AircraftId}. Delay: {DelayMinutes} minutes.", delayDto.AircraftId, delayDto.DelayMinutes);

        if (!Guid.TryParse(delayDto.AircraftId, out var aircraftGuid))
        {
            _logger.LogWarning("Invalid AircraftId format: {AircraftId}", delayDto.AircraftId);
            return;
        }

        bool slaRiskDetected = false;
        string riskMessage = "";

        // 1. Check scheduled maintenance
        var maintenanceResponse = await _maintenanceService.GetAllAsync(1, 100, aircraftGuid);
        if (maintenanceResponse.Success && maintenanceResponse.Data != null)
        {
            var upcomingMaintenances = maintenanceResponse.Data.Items
                .Where(m => m.NextScheduledDate.HasValue || m.Date.Date >= DateTime.Today)
                .ToList();

            if (upcomingMaintenances.Any() && delayDto.DelayMinutes >= 180)
            {
                slaRiskDetected = true;
                riskMessage += $"Bakım zamanlaması aşıldı! ";
            }
        }

        // 2. Check Jet Bridge Reservation
        var bridgeResponse = await _jetBridgeService.GetAllAssignmentsAsync();
        if (bridgeResponse.Success && bridgeResponse.Data != null)
        {
            var upcomingBridges = bridgeResponse.Data
                .Where(a => a.AircraftId == aircraftGuid && a.Status == JetBridgeAssignmentStatus.Planned)
                .ToList();

            if (upcomingBridges.Any() && delayDto.DelayMinutes >= 60) // 1 saat gecikme bile körük planını bozabilir
            {
                slaRiskDetected = true;
                riskMessage += $"Körük rezervasyonu (Köprü {upcomingBridges.First().BridgeNo}) tehlikede! ";
            }
        }

        // 3. Create Crisis / Fault Report if SLA risk exists
        if (slaRiskDetected)
        {
            _logger.LogWarning("SLA Risk Alert: Uçak {AircraftId} için {RiskMessage}", delayDto.AircraftId, riskMessage);

            var report = new CreateFaultReportDto
            {
                AircraftId = aircraftGuid,
                Priority = Priority.High,
                Description = $"SLA Risk Alert: Uçak {delayDto.AircraftId} için operasyonel risk! {riskMessage} (Gecikme: {delayDto.DelayMinutes} dk)"
            };

            await _faultReportService.CreateAsync(report, Guid.Empty);
        }
    }
}
