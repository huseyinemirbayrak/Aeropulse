using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class Gate : BaseEntity
{
    public string GateNumber { get; set; } = string.Empty; // e.g., "A1", "A2", "B4", "Stand-101"
    public string TerminalCode { get; set; } = "T1";
    public bool HasJetBridge { get; set; } = true;
    public GateStatus Status { get; set; } = GateStatus.Available;
    public string? CurrentFlightNumber { get; set; }
    public Guid? CurrentAircraftId { get; set; }
    public Aircraft? CurrentAircraft { get; set; }
}
