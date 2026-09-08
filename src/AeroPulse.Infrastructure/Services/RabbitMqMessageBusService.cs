using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace AeroPulse.Infrastructure.Services;

public class RabbitMqMessageBusService : IMessageBusService
{
    private readonly ILogger<RabbitMqMessageBusService> _logger;
    private readonly IConnectionFactory _connectionFactory;

    public RabbitMqMessageBusService(ILogger<RabbitMqMessageBusService> logger, IConfiguration configuration)
    {
        _logger = logger;
        
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
            _logger.LogError(ex, "❌ [RABBITMQ] Error publishing message to {QueueName}", queueName);
            throw; // Re-throw or handle based on resilience needs
        }
    }
}
