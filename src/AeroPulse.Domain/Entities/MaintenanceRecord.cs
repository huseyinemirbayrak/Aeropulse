using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class MaintenanceRecord : BaseEntity
{
    public Guid AircraftId { get; set; }
    public Guid? PartId { get; set; }
    public string WorkPerformed { get; set; } = string.Empty;
    public Guid EngineerId { get; set; }
    public DateTime Date { get; set; }
    public string CertificateNo { get; set; } = string.Empty;
    public MaintenanceType MaintenanceType { get; set; }
    public DateTime? NextScheduledDate { get; set; }
    public string Notes { get; set; } = string.Empty;

    // Navigation properties
    public Aircraft Aircraft { get; set; } = null!;
    public Part? Part { get; set; }
    public User Engineer { get; set; } = null!;
}
