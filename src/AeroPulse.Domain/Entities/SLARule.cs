using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class SLARule : BaseEntity
{
    public Priority Priority { get; set; }
    public int MaxResolutionTimeMinutes { get; set; }
}
