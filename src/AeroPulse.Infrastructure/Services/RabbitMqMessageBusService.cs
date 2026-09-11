using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace AeroPulse.Infrastructure.Services;

public class RabbitMqMessageBusService : IMessageBusService
{
    private readonly ILogger<RabbitMqMessageBusService> _logger;
    private readonly IConnectionFactory _connectionFactory;
    private readonly IServiceProvider _serviceProvider;

    public RabbitMqMessageBusService(ILogger<RabbitMqMessageBusService> logger, IConfiguration configuration, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        
        var connectionString = configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672";
        _connectionFactory = new ConnectionFactory
        {
            Uri = new Uri(connectionString)
        };
    }

    public async Task PublishAsync<T>(string queueName, T message)
    {
        try
        {
            await using var connection = await _connectionFactory.CreateConnectionAsync();
            await using var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties
            {
                Persistent = true
            };

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: queueName,
                mandatory: true,
                basicProperties: properties,
                body: body);

            _logger.LogInformation("📨 [RABBITMQ] Published message to {QueueName}", queueName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ [RABBITMQ] AMQP broker erişilemedi veya hata verdi, yerel dağıtıma devam ediliyor.");
        }

        // Real-Time SignalR bildirimini her halükarda tetikle
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
            _logger.LogWarning(ex, "⚠️ [RABBITMQ] Real-time notifier dağıtımında hata oluştu.");
        }
    }
}
