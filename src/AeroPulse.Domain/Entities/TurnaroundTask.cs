using AeroPulse.Domain.Common;
using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class TurnaroundTask : BaseEntity, ITenantEntity
{
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid OperationId { get; set; }
    public Operation Operation { get; set; } = null!;

    public TurnaroundTaskType TaskType { get; set; }
    public TurnaroundTaskStatus Status { get; set; } = TurnaroundTaskStatus.Pending;

    public int TargetDurationMinutes { get; set; } = 30;
    public DateTime? ScheduledStartTime { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }

    public int ProgressPercentage { get; set; } = 0; // 0 - 100
    public string? Notes { get; set; }

    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public Guid? AssignedGSEId { get; set; }
    public GroundSupportEquipment? AssignedGSE { get; set; }
}
