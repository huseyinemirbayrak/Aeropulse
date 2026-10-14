using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class Runway : BaseEntity
{
    public string RunwayCode { get; set; } = string.Empty;
    public RunwayStatus Status { get; set; } = RunwayStatus.Available;
    public int LengthMeters { get; set; } = 3750;
    public string SurfaceType { get; set; } = "Asphalt";
    public string? CurrentFlightNumber { get; set; }
    public DateTime? StatusChangedAt { get; set; }
}
