using AeroPulse.Domain.Common;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class Operation : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid AircraftId { get; set; }
    public string GateNo { get; set; } = string.Empty;
    public DateTime ArrivalTime { get; set; }
    public DateTime DepartureTime { get; set; }
    public OperationStatus Status { get; set; } = OperationStatus.Scheduled;
    public int DelayMinutes { get; set; }
    public string? DelayReason { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string? AssignedRunwayCode { get; set; }
    public Guid? OperationsManagerId { get; set; }

    // Navigation properties
    public Aircraft Aircraft { get; set; } = null!;
    public User? OperationsManager { get; set; }
    public ICollection<JetBridgeAssignment> JetBridgeAssignments { get; set; } = new List<JetBridgeAssignment>();
    public ICollection<TurnaroundTask> TurnaroundTasks { get; set; } = new List<TurnaroundTask>();
    public PassengerManifest? PassengerManifest { get; set; }
}
