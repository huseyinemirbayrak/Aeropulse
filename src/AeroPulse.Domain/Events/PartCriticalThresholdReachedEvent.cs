namespace AeroPulse.Domain.Events;

public class PartCriticalThresholdReachedEvent
{
    public Guid PartId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string PartNumber { get; set; } = string.Empty;
    public Guid AircraftId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public double UsedHours { get; set; }
    public double CriticalThresholdHours { get; set; }
    public double LifeSpanHours { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
