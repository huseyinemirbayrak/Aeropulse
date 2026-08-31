using AeroPulse.Domain.Enums;

namespace AeroPulse.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();
    public ICollection<FaultReport> ReportedFaults { get; set; } = new List<FaultReport>();
    public ICollection<FaultReport> AssignedFaults { get; set; } = new List<FaultReport>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Operation> ManagedOperations { get; set; } = new List<Operation>();
}
