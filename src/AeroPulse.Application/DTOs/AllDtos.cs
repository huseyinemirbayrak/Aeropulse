using AeroPulse.Domain.Enums;

namespace AeroPulse.Application.DTOs;

// ========== AUTH DTOs ==========
public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserRole Role { get; set; }
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string RoleName => Role.ToString();
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateUserDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole? Role { get; set; }
    public bool? IsActive { get; set; }
}

// ========== AIRCRAFT DTOs ==========
public class AircraftDto
{
    public Guid Id { get; set; }
    public string TailNumber { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int ManufactureYear { get; set; }
    public AircraftStatus StatusCode { get; set; }
    public string StatusName => StatusCode.ToString();
    public double TotalFlightHours { get; set; }
    public string Operator { get; set; } = string.Empty;
    public int PartsCount { get; set; }
    public int ActiveFaultsCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAircraftDto
{
    public string TailNumber { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int ManufactureYear { get; set; }
    public AircraftStatus StatusCode { get; set; } = AircraftStatus.Active;
    public double TotalFlightHours { get; set; }
    public string Operator { get; set; } = string.Empty;
}

public class UpdateAircraftDto
{
    public string? TailNumber { get; set; }
    public string? Model { get; set; }
    public int? ManufactureYear { get; set; }
    public AircraftStatus? StatusCode { get; set; }
    public double? TotalFlightHours { get; set; }
    public string? Operator { get; set; }
}

// ========== PART DTOs ==========
public class PartDto
{
    public Guid Id { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string PartNumber { get; set; } = string.Empty;
    public Guid AircraftId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public double LifeSpanHours { get; set; }
    public double UsedHours { get; set; }
    public double CriticalThresholdHours { get; set; }
    public double RemainingLifeHours { get; set; }
    public double UsagePercentage { get; set; }
    public bool IsCritical { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePartDto
{
    public string PartName { get; set; } = string.Empty;
    public string PartNumber { get; set; } = string.Empty;
    public Guid AircraftId { get; set; }
    public double LifeSpanHours { get; set; }
    public double UsedHours { get; set; }
    public double CriticalThresholdHours { get; set; }
    public string Location { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
}

public class UpdatePartDto
{
    public string? PartName { get; set; }
    public string? PartNumber { get; set; }
    public double? LifeSpanHours { get; set; }
    public double? UsedHours { get; set; }
    public double? CriticalThresholdHours { get; set; }
    public string? Location { get; set; }
    public string? Manufacturer { get; set; }
    public bool? IsActive { get; set; }
}

// ========== MAINTENANCE DTOs ==========
public class MaintenanceRecordDto
{
    public Guid Id { get; set; }
    public Guid AircraftId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public Guid? PartId { get; set; }
    public string? PartName { get; set; }
    public string WorkPerformed { get; set; } = string.Empty;
    public Guid EngineerId { get; set; }
    public string EngineerName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string CertificateNo { get; set; } = string.Empty;
    public MaintenanceType MaintenanceType { get; set; }
    public string MaintenanceTypeName => MaintenanceType.ToString();
    public DateTime? NextScheduledDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateMaintenanceRecordDto
{
    public Guid AircraftId { get; set; }
    public Guid? PartId { get; set; }
    public string WorkPerformed { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string CertificateNo { get; set; } = string.Empty;
    public MaintenanceType MaintenanceType { get; set; }
    public DateTime? NextScheduledDate { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class UpdateMaintenanceRecordDto
{
    public string? WorkPerformed { get; set; }
    public string? CertificateNo { get; set; }
    public MaintenanceType? MaintenanceType { get; set; }
    public DateTime? NextScheduledDate { get; set; }
    public string? Notes { get; set; }
}

// ========== DASHBOARD DTOs ==========
public class AdminDashboardDto
{
    public int TotalAircraft { get; set; }
    public int ActiveAircraft { get; set; }
    public int InMaintenanceAircraft { get; set; }
    public int TotalUsers { get; set; }
    public int OpenFaults { get; set; }
    public int CriticalFaults { get; set; }
    public int SLABreaches { get; set; }
    public int CriticalParts { get; set; }
    public int TotalMaintenanceRecords { get; set; }
    public List<RecentFaultDto> RecentFaults { get; set; } = new();
    public List<AircraftStatusSummaryDto> AircraftStatusSummary { get; set; } = new();
}

public class MRODashboardDto
{
    public int MyOpenTasks { get; set; }
    public int CompletedThisMonth { get; set; }
    public int CriticalPartsCount { get; set; }
    public int PendingMaintenanceCount { get; set; }
    public List<MaintenanceRecordDto> UpcomingMaintenance { get; set; } = new();
    public List<PartDto> CriticalParts { get; set; } = new();
}

public class RecentFaultDto
{
    public Guid Id { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Priority Priority { get; set; }
    public FaultStatus Status { get; set; }
    public DateTime OpenDate { get; set; }
}

public class AircraftStatusSummaryDto
{
    public AircraftStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public int Count { get; set; }
}

// ========== OPERATION DTOs ==========
public class OperationDto
{
    public Guid Id { get; set; }
    public Guid AircraftId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public string GateNo { get; set; } = string.Empty;
    public string FlightNumber { get; set; } = string.Empty;
    public DateTime ArrivalTime { get; set; }
    public DateTime DepartureTime { get; set; }
    public OperationStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public int DelayMinutes { get; set; }
    public string? DelayReason { get; set; }
    public Guid? OperationsManagerId { get; set; }
    public string? OperationsManagerName { get; set; }
    public bool SLARecorded { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateOperationDto
{
    public Guid AircraftId { get; set; }
    public string GateNo { get; set; } = string.Empty;
    public string FlightNumber { get; set; } = string.Empty;
    public DateTime ArrivalTime { get; set; }
    public DateTime DepartureTime { get; set; }
    public Guid? OperationsManagerId { get; set; }
}

public class UpdateOperationDto
{
    public string? GateNo { get; set; }
    public string? FlightNumber { get; set; }
    public DateTime? ArrivalTime { get; set; }
    public DateTime? DepartureTime { get; set; }
    public OperationStatus? Status { get; set; }
    public int? DelayMinutes { get; set; }
    public string? DelayReason { get; set; }
    public Guid? OperationsManagerId { get; set; }
}

public class CloseOperationDto
{
    public int DelayMinutes { get; set; }
    public string? DelayReason { get; set; }
    public string? CompletionNotes { get; set; }
}

public class SLARecordDto
{
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public int TurnaroundMinutes { get; set; }
    public int DelayMinutes { get; set; }
    public bool MetSLA { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime RecordedAt { get; set; }
}

public class OperationChecklistItemDto
{
    public string Step { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public string? CompletedBy { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class OperationChecklistDto
{
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string AircraftTailNumber { get; set; } = string.Empty;
    public string GateNo { get; set; } = string.Empty;
    public OperationStatus Status { get; set; }
    public List<OperationChecklistItemDto> Items { get; set; } = new();
}

// ========== FAULT REPORT DTOs ==========
public class FaultReportDto
{
    public Guid Id { get; set; }
    public Guid AircraftId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public Guid ReportedByTechnicianId { get; set; }
    public string ReportedByTechnicianName { get; set; } = string.Empty;
    public Guid? AssignedEngineerId { get; set; }
    public string? AssignedEngineerName { get; set; }
    public Priority Priority { get; set; }
    public string PriorityName => Priority.ToString();
    public FaultStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime OpenDate { get; set; }
    public DateTime? CloseDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string ResolutionNotes { get; set; } = string.Empty;
    public int ElapsedMinutes { get; set; }
    public bool IsSLABreached { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateFaultReportDto
{
    public Guid AircraftId { get; set; }
    public Priority Priority { get; set; }
    public string Description { get; set; } = string.Empty;
    public Guid? AssignedEngineerId { get; set; }
}

public class UpdateFaultReportDto
{
    public FaultStatus? Status { get; set; }
    public Priority? Priority { get; set; }
    public string? ResolutionNotes { get; set; }
    public Guid? AssignedEngineerId { get; set; }
}

// ========== JET BRIDGE DTOs ==========
public class JetBridgeDto
{
    public Guid Id { get; set; }
    public string BridgeNo { get; set; } = string.Empty;
    public string TerminalNo { get; set; } = string.Empty;
    public JetBridgeStatus StatusCode { get; set; }
    public string StatusName => StatusCode.ToString();
    public JetBridgeAssignmentDto? CurrentAssignment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateJetBridgeDto
{
    public string BridgeNo { get; set; } = string.Empty;
    public string TerminalNo { get; set; } = string.Empty;
    public JetBridgeStatus StatusCode { get; set; } = JetBridgeStatus.Available;
}

public class UpdateJetBridgeDto
{
    public string? BridgeNo { get; set; }
    public string? TerminalNo { get; set; }
    public JetBridgeStatus? StatusCode { get; set; }
}

public class JetBridgeAssignmentDto
{
    public Guid Id { get; set; }
    public Guid JetBridgeId { get; set; }
    public string BridgeNo { get; set; } = string.Empty;
    public string TerminalNo { get; set; } = string.Empty;
    public Guid AircraftId { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public DateTime EstimatedArrivalTime { get; set; }
    public DateTime? ActualArrivalTime { get; set; }
    public DateTime? ConnectionTime { get; set; }
    public DateTime? DisconnectionTime { get; set; }
    public int PassengerCount { get; set; }
    public JetBridgeAssignmentStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime CreatedAt { get; set; }
}

public class CreateJetBridgeAssignmentDto
{
    public Guid JetBridgeId { get; set; }
    public Guid AircraftId { get; set; }
    public Guid OperationId { get; set; }
    public DateTime EstimatedArrivalTime { get; set; }
    public DateTime EstimatedDepartureTime { get; set; }
    public int PassengerCount { get; set; }
}

public class UpdateAssignmentStatusDto
{
    public JetBridgeAssignmentStatus NewStatus { get; set; }
}

public class JetBridgeConflictResultDto
{
    public bool HasConflict { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<JetBridgeDto> AlternativeBridges { get; set; } = new();
    public JetBridgeAssignmentDto? ConflictingAssignment { get; set; }
}

// ========== NOTIFICATION DTOs ==========
public class NotificationDto
{
    public Guid Id { get; set; }
    public Guid RecipientUserId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public Guid? FaultReportId { get; set; }
    public string Message { get; set; } = string.Empty;
    public NotificationType NotificationType { get; set; }
    public string NotificationTypeName => NotificationType.ToString();
    public bool IsRead { get; set; }
    public DateTime Date { get; set; }
}

// ========== DASHBOARD (OPS) DTOs ==========
public class OpsDashboardDto
{
    public int ActiveOperations { get; set; }
    public int ScheduledOperations { get; set; }
    public int CompletedToday { get; set; }
    public int DelayedOperations { get; set; }
    public int AvailableBridges { get; set; }
    public int TotalBridges { get; set; }
    public int OpenFaultReports { get; set; }
    public List<OperationDto> RecentOperations { get; set; } = new();
    public List<JetBridgeDto> JetBridges { get; set; } = new();
}

// ========== METRICS DTO ==========
public class MetricsDto
{
    public int TotalOpenFaults { get; set; }
    public int TotalSLABreaches { get; set; }
    public double AvgFaultResolutionMinutes { get; set; }
    public int ActiveOperations { get; set; }
    public int AvailableJetBridges { get; set; }
    public int TotalJetBridges { get; set; }
    public int ConnectedJetBridges { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

// ========== COMMON DTOs ==========
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "Success")
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message)
        => new() { Success = false, Message = message };
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
