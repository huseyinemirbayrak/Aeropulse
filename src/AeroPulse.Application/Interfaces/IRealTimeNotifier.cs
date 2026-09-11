namespace AeroPulse.Application.Interfaces;

/// <summary>
/// WebSocket / SignalR üzerinden istemcilere anlık canlı operasyonel veri fırlatan servis arayüzü.
/// </summary>
public interface IRealTimeNotifier
{
    Task SendTurnaroundUpdateAsync(TurnaroundTaskUpdatedEvent update);
    Task SendGateOverrideAsync(FlightGateOverrideEvent gateOverride);
    Task SendGseUpdateAsync(GSEStatusChangedEvent gseUpdate);
    Task SendBoardingUpdateAsync(BoardingProgressEvent boardingUpdate);
    Task SendFlightAlertAsync(FlightAlertEvent alert);
    Task SendRawEventAsync(string eventName, object payload);
}
