using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class JetBridgeAssignment : BaseEntity
{
    public Guid JetBridgeId { get; set; }
    public Guid AircraftId { get; set; }
    public Guid OperationId { get; set; }
    public DateTime EstimatedArrivalTime { get; set; }
    public DateTime? ActualArrivalTime { get; set; }
    public DateTime? ConnectionTime { get; set; }
    public DateTime? DisconnectionTime { get; set; }
    public int PassengerCount { get; set; }
    public JetBridgeAssignmentStatus Status { get; set; } = JetBridgeAssignmentStatus.Planned;

    // Navigation properties
    public JetBridge JetBridge { get; set; } = null!;
    public Aircraft Aircraft { get; set; } = null!;
    public Operation Operation { get; set; } = null!;
}
