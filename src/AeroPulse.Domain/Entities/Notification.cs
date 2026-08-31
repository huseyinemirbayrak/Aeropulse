using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid? FaultReportId { get; set; }
    public Guid RecipientUserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public NotificationType NotificationType { get; set; }

    // Navigation properties
    public FaultReport? FaultReport { get; set; }
    public User RecipientUser { get; set; } = null!;
}
