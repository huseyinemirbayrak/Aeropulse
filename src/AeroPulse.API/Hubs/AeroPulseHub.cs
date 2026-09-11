using Microsoft.AspNetCore.SignalR;

namespace AeroPulse.API.Hubs;

/// <summary>
/// AeroPulse Merkezi Operasyon Canlı WebSocket (SignalR) Hub'ı.
/// Turnaround görevleri, kapı değişiklikleri, GSE hareketleri ve yolcu biniş sayaçlarını
/// F5 gerektirmeden tüm ekranlara anında canlı dağıtır.
/// </summary>
public class AeroPulseHub : Hub
{
    private readonly ILogger<AeroPulseHub> _logger;

    public AeroPulseHub(ILogger<AeroPulseHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("🟢 [SIGNALR] Client bağlandı: {ConnectionId}", Context.ConnectionId);
        await Clients.Caller.SendAsync("ReceiveConnectionAck", new
        {
            ConnectionId = Context.ConnectionId,
            ServerTime = DateTime.UtcNow,
            Message = "AeroPulse Real-Time Operations Stream Active"
        });
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("🔴 [SIGNALR] Client ayrıldı: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Belirli bir uçuşun operasyonel grubuna katılma
    /// </summary>
    public async Task JoinFlightGroup(string flightNumber)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Flight_{flightNumber}");
        _logger.LogInformation("✈️ [SIGNALR] {ConnectionId} uçuş grubuna katıldı: Flight_{FlightNumber}", Context.ConnectionId, flightNumber);
    }

    /// <summary>
    /// Uçuş grubundan ayrılma
    /// </summary>
    public async Task LeaveFlightGroup(string flightNumber)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Flight_{flightNumber}");
        _logger.LogInformation("🚪 [SIGNALR] {ConnectionId} uçuş grubundan ayrıldı: Flight_{FlightNumber}", Context.ConnectionId, flightNumber);
    }
}
