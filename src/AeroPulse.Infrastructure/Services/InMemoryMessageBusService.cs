using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace AeroPulse.Infrastructure.Services;

/// <summary>
/// RabbitMQ'nun in-memory simülasyonu & SignalR Real-Time köprüsü.
/// Mesaj kuyruğuna atılan tüm operasyonel event'leri JSON loglar ve
/// anında IRealTimeNotifier aracılığıyla SignalR WebSocket istemcilerine dağıtır.
/// </summary>
public class InMemoryMessageBusService : IMessageBusService
{
    private readonly ILogger<InMemoryMessageBusService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public InMemoryMessageBusService(ILogger<InMemoryMessageBusService> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public async Task PublishAsync<T>(string queueName, T message)
    {
        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions { WriteIndented = true });

        _logger.LogInformation(
            """
            ╔══════════════════════════════════════════════════════╗
            ║  📨 [IN-MEMORY MESSAGE BUS] Mesaj Kuyruğa Düştü     ║
            ╠══════════════════════════════════════════════════════╣
            ║  Queue : {QueueName,-44} ║
            ╚══════════════════════════════════════════════════════╝
            {Message}
            """,
            queueName,
            json
        );

        // SignalR Real-Time Notifier üzerinden WebSocket abonelerine canlı fırlat
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var notifier = scope.ServiceProvider.GetService<IRealTimeNotifier>();
            if (notifier != null)
            {
                switch (message)
                {
                    case TurnaroundTaskUpdatedEvent turnaroundEvent:
                        await notifier.SendTurnaroundUpdateAsync(turnaroundEvent);
                        break;
                    case FlightGateOverrideEvent gateOverrideEvent:
                        await notifier.SendGateOverrideAsync(gateOverrideEvent);
                        break;
                    case GSEStatusChangedEvent gseEvent:
                        await notifier.SendGseUpdateAsync(gseEvent);
                        break;
                    case BoardingProgressEvent boardingEvent:
                        await notifier.SendBoardingUpdateAsync(boardingEvent);
                        break;
                    case FlightAlertEvent alertEvent:
                        await notifier.SendFlightAlertAsync(alertEvent);
                        break;
                    default:
                        if (message != null)
                        {
                            await notifier.SendRawEventAsync(queueName, message);
                        }
                        break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ [MESSAGE BUS] Real-time notifier dağıtımında hata oluştu.");
        }
    }
}
