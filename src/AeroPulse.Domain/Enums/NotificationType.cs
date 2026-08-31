namespace AeroPulse.Domain.Enums;

public enum NotificationType
{
    FaultAssigned = 0,
    FaultStatusChanged = 1,
    SLAWarning = 2,
    SLABreached = 3,
    PartCriticalThreshold = 4,
    MaintenanceScheduled = 5,
    General = 6,
    JetBridgeConnected = 7,
    JetBridgeReleased = 8,
    OperationDelayed = 9,
    OperationCompleted = 10
}
