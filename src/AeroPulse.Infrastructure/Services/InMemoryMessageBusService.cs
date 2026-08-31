using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace AeroPulse.Infrastructure.Services;

/// <summary>
/// RabbitMQ'nun in-memory simülasyonu.
/// 
/// Gerçek RabbitMQ kurulumu Docker ve ekstra paket gerektirir.
/// Bu implementasyon geliştirme/test ortamında çalışır:
///   - Mesajları JSON'a çevirip log'a yazar
///   - Aynı interface'i kullandığı için production'da gerçek implementasyonla değiştirilebilir
/// 
/// GERÇEĞİNE GEÇİŞ: appsettings.json'da RabbitMQ bölümü doldurunca
/// DependencyInjection.cs'deki bu satırı değiştirirsin:
///   services.AddScoped<IMessageBusService, InMemoryMessageBusService>();
///   →
///   services.AddScoped<IMessageBusService, RabbitMqMessageBusService>();
/// </summary>
public class InMemoryMessageBusService : IMessageBusService
{
    private readonly ILogger<InMemoryMessageBusService> _logger;

    public InMemoryMessageBusService(ILogger<InMemoryMessageBusService> logger)
    {
        _logger = logger;
    }

    public Task PublishAsync<T>(string queueName, T message)
    {
        var json = JsonSerializer.Serialize(message, new JsonSerializerOptions { WriteIndented = true });

        _logger.LogInformation(
            """
            ╔══════════════════════════════════════════════════════╗
            ║  📨 [IN-MEMORY MESSAGE BUS] Mesaj Kuyruğa Düştü     ║
            ╠══════════════════════════════════════════════════════╣
            ║  Queue : {QueueName,-50} ║
            ╚══════════════════════════════════════════════════════╝
            {Message}
            """,
            queueName,
            json
        );

        // Gerçek RabbitMQ'da burada channel.BasicPublish() çağrılır
        return Task.CompletedTask;
    }
}
