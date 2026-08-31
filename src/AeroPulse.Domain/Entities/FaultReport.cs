using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class FaultReport : BaseEntity
{
    public Guid AircraftId { get; set; }
    public Guid ReportedByTechnicianId { get; set; }
    public Guid? AssignedEngineerId { get; set; }
    public Priority Priority { get; set; }
    public FaultStatus Status { get; set; } = FaultStatus.Open;
    public DateTime OpenDate { get; set; } = DateTime.UtcNow;
    public DateTime? CloseDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string ResolutionNotes { get; set; } = string.Empty;

    // Navigation properties
    public Aircraft Aircraft { get; set; } = null!;
    public User ReportedByTechnician { get; set; } = null!;
    public User? AssignedEngineer { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
