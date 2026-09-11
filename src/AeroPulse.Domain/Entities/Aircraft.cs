using AeroPulse.Domain.Common;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class Aircraft : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string TailNumber { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int ManufactureYear { get; set; }
    public AircraftStatus StatusCode { get; set; } = AircraftStatus.Active;
    public double TotalFlightHours { get; set; }
    public string Operator { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<Part> Parts { get; set; } = new List<Part>();
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();
    public ICollection<FaultReport> FaultReports { get; set; } = new List<FaultReport>();
    public ICollection<Operation> Operations { get; set; } = new List<Operation>();
    public ICollection<JetBridgeAssignment> JetBridgeAssignments { get; set; } = new List<JetBridgeAssignment>();
}
