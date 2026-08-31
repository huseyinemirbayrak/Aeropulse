namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Mesaj kuyruğu (RabbitMQ veya In-Memory) için soyutlama arayüzü.
/// Bu sayede gerçek RabbitMQ yerine test/geliştirme ortamında in-memory çalışabilir.
/// </summary>
public interface IMessageBusService
{
    /// <summary>
    /// Bir mesajı kuyruğa yayınlar (publish).
    /// </summary>
    /// <param name="queueName">Kuyruk adı (ör: "fault.assigned", "bridge.connected")</param>
    /// <param name="message">Gönderilecek mesaj nesnesi</param>
    Task PublishAsync<T>(string queueName, T message);
}

/// <summary>
/// Mesaj kuyruğundaki mesajların yapısı.
/// Her bildirim bu format ile gönderilir.
/// </summary>
public class BridgeStatusMessage
{
    public string EventType { get; set; } = string.Empty; // ör: "BridgeConnected"
    public string FlightNumber { get; set; } = string.Empty;
    public string BridgeNo { get; set; } = string.Empty;
    public string TerminalNo { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public List<Guid> RecipientUserIds { get; set; } = new();
}

public class FaultAssignedMessage
{
    public string EventType { get; set; } = "FaultAssigned";
    public Guid FaultReportId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public Guid AssignedEngineerId { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
