namespace AeroPulse.Domain.Entities;

public class Part : BaseEntity
{
    public string PartName { get; set; } = string.Empty;
    public string PartNumber { get; set; } = string.Empty;
    public Guid AircraftId { get; set; }
    public double LifeSpanHours { get; set; }
    public double UsedHours { get; set; }
    public double CriticalThresholdHours { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Aircraft Aircraft { get; set; } = null!;
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();

    // Domain logic
    public bool IsCritical => UsedHours >= CriticalThresholdHours;
    public double RemainingLifeHours => Math.Max(0, LifeSpanHours - UsedHours);
    public double UsagePercentage => LifeSpanHours > 0 ? (UsedHours / LifeSpanHours) * 100 : 0;
}
