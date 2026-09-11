using AeroPulse.Domain.Common;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class PassengerManifest : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid OperationId { get; set; }
    public Operation Operation { get; set; } = null!;

    public string FlightNumber { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string GateNo { get; set; } = string.Empty;

    public int TotalBooked { get; set; }
    public int BoardedCount { get; set; }
    public int CheckedBaggageCount { get; set; }
    public int LoadedBaggageCount { get; set; }

    public BoardingStatus BoardingStatus { get; set; } = BoardingStatus.NotStarted;
    public bool LuggageMatchComplete { get; set; } = false;
    public bool LoadsheetApproved { get; set; } = false;
    public string? ApprovedByRedcap { get; set; }
    public DateTime? DepartureClearanceGivenAt { get; set; }
}
