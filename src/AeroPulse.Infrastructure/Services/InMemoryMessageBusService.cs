using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace AeroPulse.Infrastructure.Services;

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
            "[MessageBus] Event published to {QueueName}: {Payload}",
            queueName,
            json
        );

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
            _logger.LogWarning(ex, "[MessageBus] Failed to dispatch real-time notification.");
        }
    }
}
