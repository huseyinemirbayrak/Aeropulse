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

// Operasyonel event modelleri (kuyruk mesajlari icin)

public class TurnaroundTaskUpdatedEvent
{
    public Guid TaskId { get; set; }
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string TaskType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ProgressPercentage { get; set; }
    public string? Notes { get; set; }
    public string? AssignedUserName { get; set; }
    public string? AssignedGSECode { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FlightGateOverrideEvent
{
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string? OldGateNumber { get; set; }
    public string NewGateNumber { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class GSEStatusChangedEvent
{
    public Guid GSEId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Idle, Busy, OutOfService
    public int FuelLevelPercentage { get; set; }
    public string? ApronZone { get; set; }
    public string? CurrentTaskDescription { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class BoardingProgressEvent
{
    public Guid ManifestId { get; set; }
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public int BoardedCount { get; set; }
    public int TotalPassengers { get; set; }
    public int LoadedBaggageCount { get; set; }
    public int TotalBaggageCount { get; set; }
    public string BoardingStatus { get; set; } = string.Empty;
    public bool LuggageMatchComplete { get; set; }
    public bool LoadsheetApproved { get; set; }
    public string? ApprovedByRedcap { get; set; }
    public string? ActionDescription { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FlightAlertEvent
{
    public string FlightNumber { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty; // GateChange, DepartureClearance, Delay, GSEWarning
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info"; // Info, Warning, Danger
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
