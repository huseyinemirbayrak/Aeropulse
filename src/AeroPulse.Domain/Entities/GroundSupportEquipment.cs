using AeroPulse.Domain.Common;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class GroundSupportEquipment : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Code { get; set; } = string.Empty; // e.g. "BUS-01", "TANKER-02", "TUG-04"
    public string Name { get; set; } = string.Empty;
    public GSEType Type { get; set; }
    public GSEStatus Status { get; set; } = GSEStatus.Idle;
    
    public int FuelLevelPercentage { get; set; } = 85;
    public string ApronZone { get; set; } = "Terminal 1 Ramp";
    public double Latitude { get; set; } = 41.2753; // Default near Istanbul Airport (LTFM)
    public double Longitude { get; set; } = 28.7519;

    public string? OperatorName { get; set; }
    public string? CurrentTaskDescription { get; set; }

    public ICollection<TurnaroundTask> AssignedTasks { get; set; } = new List<TurnaroundTask>();
}
