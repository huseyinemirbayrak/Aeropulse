using AeroPulse.API.Hubs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AeroPulse.API.Services;

/// <summary>
/// IRealTimeNotifier uygulayıcısı: HubContext üzerinden bağlı SignalR istemcilerine operasyonel event'leri canlı iletir.
/// </summary>
public class SignalRRealTimeNotifier : IRealTimeNotifier
{
    private readonly IHubContext<AeroPulseHub> _hubContext;
    private readonly ILogger<SignalRRealTimeNotifier> _logger;

    public SignalRRealTimeNotifier(IHubContext<AeroPulseHub> hubContext, ILogger<SignalRRealTimeNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task SendTurnaroundUpdateAsync(TurnaroundTaskUpdatedEvent update)
    {
        _logger.LogInformation("📡 [SIGNALR BROADCAST] TurnaroundTaskUpdated: {FlightNumber} - {TaskType} ({Status} %{Progress})",
            update.FlightNumber, update.TaskType, update.Status, update.ProgressPercentage);

        await _hubContext.Clients.All.SendAsync("ReceiveTurnaroundUpdate", update);
        if (!string.IsNullOrEmpty(update.FlightNumber))
        {
            await _hubContext.Clients.Group($"Flight_{update.FlightNumber}").SendAsync("ReceiveFlightTurnaroundUpdate", update);
        }
    }

    public async Task SendGateOverrideAsync(FlightGateOverrideEvent gateOverride)
    {
        _logger.LogInformation("📡 [SIGNALR BROADCAST] GateOverride: {FlightNumber} {OldGate} -> {NewGate}",
            gateOverride.FlightNumber, gateOverride.OldGateNumber, gateOverride.NewGateNumber);

        await _hubContext.Clients.All.SendAsync("ReceiveGateOverride", gateOverride);
        
        // Also broadcast an alert so dashboard shows a high-priority toast
        await _hubContext.Clients.All.SendAsync("ReceiveFlightAlert", new FlightAlertEvent
        {
            FlightNumber = gateOverride.FlightNumber,
            AlertType = "GateChange",
            Message = $"Uçuş {gateOverride.FlightNumber} kapısı {gateOverride.OldGateNumber ?? "Açık"} yerine {gateOverride.NewGateNumber} olarak güncellendi. Sebep: {gateOverride.Reason ?? "Operasyonel karar"}",
            Severity = "Warning",
            OccurredAt = DateTime.UtcNow
        });
    }

    public async Task SendGseUpdateAsync(GSEStatusChangedEvent gseUpdate)
    {
        _logger.LogInformation("📡 [SIGNALR BROADCAST] GSEStatusChanged: {Code} ({Status} %{Fuel})",
            gseUpdate.Code, gseUpdate.Status, gseUpdate.FuelLevelPercentage);

        await _hubContext.Clients.All.SendAsync("ReceiveGseUpdate", gseUpdate);
    }

    public async Task SendBoardingUpdateAsync(BoardingProgressEvent boardingUpdate)
    {
        _logger.LogInformation("📡 [SIGNALR BROADCAST] BoardingProgress: {FlightNumber} (Pax: {Boarded}/{Total}, Luggage: {Luggage}/{TotalLuggage})",
            boardingUpdate.FlightNumber, boardingUpdate.BoardedCount, boardingUpdate.TotalPassengers, boardingUpdate.LoadedBaggageCount, boardingUpdate.TotalBaggageCount);

        await _hubContext.Clients.All.SendAsync("ReceiveBoardingUpdate", boardingUpdate);
        if (!string.IsNullOrEmpty(boardingUpdate.FlightNumber))
        {
            await _hubContext.Clients.Group($"Flight_{boardingUpdate.FlightNumber}").SendAsync("ReceiveFlightBoardingUpdate", boardingUpdate);
        }
    }

    public async Task SendFlightAlertAsync(FlightAlertEvent alert)
    {
        _logger.LogInformation("📡 [SIGNALR BROADCAST] FlightAlert: [{Severity}] {FlightNumber} - {Message}",
            alert.Severity, alert.FlightNumber, alert.Message);

        await _hubContext.Clients.All.SendAsync("ReceiveFlightAlert", alert);
    }

    public async Task SendRawEventAsync(string eventName, object payload)
    {
        await _hubContext.Clients.All.SendAsync(eventName, payload);
    }
}
