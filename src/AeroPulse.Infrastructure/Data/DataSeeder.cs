using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AeroPulseDbContext context)
    {
        if (await context.Users.AnyAsync())
            return; // Already seeded

        // ===== USERS =====
        var adminUser = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
            FullName = "John Administrator",
            Email = "admin@aeropulse.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = UserRole.Admin,
            IsActive = true
        };

        var opsManager = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000002"),
            FullName = "Sarah Operations",
            Email = "ops@aeropulse.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Ops123!"),
            Role = UserRole.OperationsManager,
            IsActive = true
        };

        var mroEngineer1 = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000003"),
            FullName = "Mike Engineer",
            Email = "engineer@aeropulse.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Eng123!"),
            Role = UserRole.MROEngineer,
            IsActive = true
        };

        var mroEngineer2 = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000004"),
            FullName = "Lisa Mechanic",
            Email = "engineer2@aeropulse.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Eng123!"),
            Role = UserRole.MROEngineer,
            IsActive = true
        };

        var fieldTech = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000005"),
            FullName = "Tom Technician",
            Email = "tech@aeropulse.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Tech123!"),
            Role = UserRole.FieldTechnician,
            IsActive = true
        };

        var viewer = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000006"),
            FullName = "Board Viewer",
            Email = "viewer@aeropulse.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("View123!"),
            Role = UserRole.Viewer,
            IsActive = true
        };

        context.Users.AddRange(adminUser, opsManager, mroEngineer1, mroEngineer2, fieldTech, viewer);

        // ===== AIRCRAFT =====
        var aircraft1 = new Aircraft
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
            TailNumber = "TC-AER",
            Model = "Boeing 737-800",
            ManufactureYear = 2015,
            StatusCode = AircraftStatus.Active,
            TotalFlightHours = 24500,
            Operator = "AeroPulse Airlines"
        };

        var aircraft2 = new Aircraft
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000002"),
            TailNumber = "TC-PLX",
            Model = "Airbus A320neo",
            ManufactureYear = 2019,
            StatusCode = AircraftStatus.Active,
            TotalFlightHours = 12300,
            Operator = "AeroPulse Airlines"
        };

        var aircraft3 = new Aircraft
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000003"),
            TailNumber = "TC-SKY",
            Model = "Boeing 777-300ER",
            ManufactureYear = 2012,
            StatusCode = AircraftStatus.InMaintenance,
            TotalFlightHours = 45000,
            Operator = "AeroPulse Airlines"
        };

        var aircraft4 = new Aircraft
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000004"),
            TailNumber = "TC-JET",
            Model = "Airbus A350-900",
            ManufactureYear = 2021,
            StatusCode = AircraftStatus.Active,
            TotalFlightHours = 6800,
            Operator = "SkyVista Air"
        };

        var aircraft5 = new Aircraft
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000005"),
            TailNumber = "TC-OLD",
            Model = "Boeing 747-400",
            ManufactureYear = 2000,
            StatusCode = AircraftStatus.Retired,
            TotalFlightHours = 82000,
            Operator = "AeroPulse Airlines"
        };

        context.Aircraft.AddRange(aircraft1, aircraft2, aircraft3, aircraft4, aircraft5);

        // ===== PARTS =====
        var parts = new List<Part>
        {
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000001"), PartName = "CFM56-7B Engine", PartNumber = "CFM56-7B-001", AircraftId = aircraft1.Id, LifeSpanHours = 30000, UsedHours = 24500, CriticalThresholdHours = 25000, Location = "Left Wing", Manufacturer = "CFM International" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000002"), PartName = "Landing Gear Assembly", PartNumber = "LG-737-002", AircraftId = aircraft1.Id, LifeSpanHours = 20000, UsedHours = 18500, CriticalThresholdHours = 18000, Location = "Main Gear", Manufacturer = "Safran" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000003"), PartName = "APU - APS3200", PartNumber = "APU-320-001", AircraftId = aircraft2.Id, LifeSpanHours = 15000, UsedHours = 8200, CriticalThresholdHours = 12000, Location = "Tail Section", Manufacturer = "Honeywell" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000004"), PartName = "Weather Radar RDR-4000", PartNumber = "RAD-001", AircraftId = aircraft2.Id, LifeSpanHours = 10000, UsedHours = 4100, CriticalThresholdHours = 8000, Location = "Nose Radome", Manufacturer = "Collins Aerospace" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000005"), PartName = "GE90-115B Engine", PartNumber = "GE90-115B-001", AircraftId = aircraft3.Id, LifeSpanHours = 40000, UsedHours = 38000, CriticalThresholdHours = 35000, Location = "Right Wing", Manufacturer = "GE Aviation" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000006"), PartName = "Flight Data Recorder", PartNumber = "FDR-777-001", AircraftId = aircraft3.Id, LifeSpanHours = 50000, UsedHours = 44800, CriticalThresholdHours = 45000, Location = "Aft Fuselage", Manufacturer = "L3Harris" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000007"), PartName = "Rolls-Royce Trent XWB", PartNumber = "TRXWB-001", AircraftId = aircraft4.Id, LifeSpanHours = 35000, UsedHours = 6800, CriticalThresholdHours = 28000, Location = "Left Wing", Manufacturer = "Rolls-Royce" },
            new Part { Id = Guid.Parse("30000000-0000-0000-0000-000000000008"), PartName = "Hydraulic Pump System", PartNumber = "HYD-350-001", AircraftId = aircraft4.Id, LifeSpanHours = 12000, UsedHours = 5200, CriticalThresholdHours = 10000, Location = "Central Hydraulics Bay", Manufacturer = "Parker Aerospace" },
        };

        context.Parts.AddRange(parts);

        // ===== MAINTENANCE RECORDS =====
        var maintenanceRecords = new List<MaintenanceRecord>
        {
            new MaintenanceRecord { Id = Guid.Parse("40000000-0000-0000-0000-000000000001"), AircraftId = aircraft1.Id, PartId = parts[0].Id, WorkPerformed = "Engine borescope inspection - No findings", EngineerId = mroEngineer1.Id, Date = DateTime.UtcNow.AddDays(-30), CertificateNo = "CERT-2026-001", MaintenanceType = MaintenanceType.Inspection, NextScheduledDate = DateTime.UtcNow.AddDays(60), Notes = "All parameters within limits" },
            new MaintenanceRecord { Id = Guid.Parse("40000000-0000-0000-0000-000000000002"), AircraftId = aircraft1.Id, PartId = parts[1].Id, WorkPerformed = "Landing gear retraction test and lubrication", EngineerId = mroEngineer1.Id, Date = DateTime.UtcNow.AddDays(-15), CertificateNo = "CERT-2026-002", MaintenanceType = MaintenanceType.Scheduled, NextScheduledDate = DateTime.UtcNow.AddDays(90), Notes = "Gear pins inspected and replaced" },
            new MaintenanceRecord { Id = Guid.Parse("40000000-0000-0000-0000-000000000003"), AircraftId = aircraft2.Id, WorkPerformed = "A-Check comprehensive inspection", EngineerId = mroEngineer2.Id, Date = DateTime.UtcNow.AddDays(-7), CertificateNo = "CERT-2026-003", MaintenanceType = MaintenanceType.Scheduled, NextScheduledDate = DateTime.UtcNow.AddDays(120), Notes = "All items completed per maintenance manual" },
            new MaintenanceRecord { Id = Guid.Parse("40000000-0000-0000-0000-000000000004"), AircraftId = aircraft3.Id, PartId = parts[4].Id, WorkPerformed = "Engine overhaul - Full teardown and rebuild", EngineerId = mroEngineer1.Id, Date = DateTime.UtcNow.AddDays(-2), CertificateNo = "CERT-2026-004", MaintenanceType = MaintenanceType.Overhaul, NextScheduledDate = DateTime.UtcNow.AddDays(365), Notes = "Engine returned to zero-time" },
            new MaintenanceRecord { Id = Guid.Parse("40000000-0000-0000-0000-000000000005"), AircraftId = aircraft3.Id, WorkPerformed = "C-Check structural inspection in progress", EngineerId = mroEngineer2.Id, Date = DateTime.UtcNow, CertificateNo = "CERT-2026-005", MaintenanceType = MaintenanceType.Inspection, NextScheduledDate = DateTime.UtcNow.AddDays(14), Notes = "In progress - fuselage section 41-46 pending" },
        };

        context.MaintenanceRecords.AddRange(maintenanceRecords);

        // ===== FAULT REPORTS =====
        var faultReports = new List<FaultReport>
        {
            new FaultReport { Id = Guid.Parse("50000000-0000-0000-0000-000000000001"), AircraftId = aircraft1.Id, ReportedByTechnicianId = fieldTech.Id, AssignedEngineerId = mroEngineer1.Id, Priority = Priority.High, Status = FaultStatus.Open, OpenDate = DateTime.UtcNow.AddHours(-4), Description = "Hydraulic leak detected on left main landing gear actuator" },
            new FaultReport { Id = Guid.Parse("50000000-0000-0000-0000-000000000002"), AircraftId = aircraft2.Id, ReportedByTechnicianId = fieldTech.Id, AssignedEngineerId = mroEngineer2.Id, Priority = Priority.Critical, Status = FaultStatus.UnderReview, OpenDate = DateTime.UtcNow.AddHours(-1), Description = "Engine vibration exceeding N1 limits on engine #2" },
            new FaultReport { Id = Guid.Parse("50000000-0000-0000-0000-000000000003"), AircraftId = aircraft1.Id, ReportedByTechnicianId = fieldTech.Id, AssignedEngineerId = mroEngineer1.Id, Priority = Priority.Medium, Status = FaultStatus.Resolved, OpenDate = DateTime.UtcNow.AddDays(-3), CloseDate = DateTime.UtcNow.AddDays(-2), Description = "Cabin pressurization warning light intermittent", ResolutionNotes = "Replaced pressure transducer, test flight satisfactory" },
            new FaultReport { Id = Guid.Parse("50000000-0000-0000-0000-000000000004"), AircraftId = aircraft3.Id, ReportedByTechnicianId = fieldTech.Id, Priority = Priority.Low, Status = FaultStatus.Open, OpenDate = DateTime.UtcNow.AddDays(-1), Description = "Minor paint chipping on left wing leading edge" },
        };

        context.FaultReports.AddRange(faultReports);

        // ===== OPERATIONS =====
        var operations = new List<Operation>
        {
            new Operation { Id = Guid.Parse("60000000-0000-0000-0000-000000000001"), AircraftId = aircraft1.Id, GateNo = "A12", ArrivalTime = DateTime.UtcNow.AddHours(-2), DepartureTime = DateTime.UtcNow.AddHours(1), Status = OperationStatus.InProgress, FlightNumber = "AP101", OperationsManagerId = opsManager.Id },
            new Operation { Id = Guid.Parse("60000000-0000-0000-0000-000000000002"), AircraftId = aircraft2.Id, GateNo = "B05", ArrivalTime = DateTime.UtcNow.AddHours(2), DepartureTime = DateTime.UtcNow.AddHours(5), Status = OperationStatus.Scheduled, FlightNumber = "AP205", OperationsManagerId = opsManager.Id },
            new Operation { Id = Guid.Parse("60000000-0000-0000-0000-000000000003"), AircraftId = aircraft4.Id, GateNo = "C08", ArrivalTime = DateTime.UtcNow.AddHours(-5), DepartureTime = DateTime.UtcNow.AddHours(-2), Status = OperationStatus.Completed, FlightNumber = "SV310", DelayMinutes = 15, DelayReason = "Late inbound aircraft" },
            new Operation { Id = Guid.Parse("60000000-0000-0000-0000-000000000004"), AircraftId = aircraft1.Id, GateNo = "A12", ArrivalTime = DateTime.UtcNow.AddHours(6), DepartureTime = DateTime.UtcNow.AddHours(9), Status = OperationStatus.Scheduled, FlightNumber = "AP402" },
        };

        context.Operations.AddRange(operations);

        // ===== JET BRIDGES =====
        var jetBridges = new List<JetBridge>
        {
            new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000001"), BridgeNo = "JB-01", TerminalNo = "T1", StatusCode = JetBridgeStatus.Connected },
            new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000002"), BridgeNo = "JB-02", TerminalNo = "T1", StatusCode = JetBridgeStatus.Available },
            new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000003"), BridgeNo = "JB-03", TerminalNo = "T1", StatusCode = JetBridgeStatus.UnderMaintenance },
            new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000004"), BridgeNo = "JB-04", TerminalNo = "T2", StatusCode = JetBridgeStatus.Available },
            new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000005"), BridgeNo = "JB-05", TerminalNo = "T2", StatusCode = JetBridgeStatus.Reserved },
        };

        context.JetBridges.AddRange(jetBridges);

        // ===== JET BRIDGE ASSIGNMENTS =====
        var assignments = new List<JetBridgeAssignment>
        {
            new JetBridgeAssignment { Id = Guid.Parse("80000000-0000-0000-0000-000000000001"), JetBridgeId = jetBridges[0].Id, AircraftId = aircraft1.Id, OperationId = operations[0].Id, EstimatedArrivalTime = DateTime.UtcNow.AddHours(-2), ActualArrivalTime = DateTime.UtcNow.AddHours(-2).AddMinutes(5), ConnectionTime = DateTime.UtcNow.AddHours(-2).AddMinutes(10), PassengerCount = 175, Status = JetBridgeAssignmentStatus.BridgeConnected },
            new JetBridgeAssignment { Id = Guid.Parse("80000000-0000-0000-0000-000000000002"), JetBridgeId = jetBridges[4].Id, AircraftId = aircraft2.Id, OperationId = operations[1].Id, EstimatedArrivalTime = DateTime.UtcNow.AddHours(2), PassengerCount = 162, Status = JetBridgeAssignmentStatus.Planned },
        };

        context.JetBridgeAssignments.AddRange(assignments);

        // ===== NOTIFICATIONS =====
        var notifications = new List<Notification>
        {
            new Notification { RecipientUserId = mroEngineer1.Id, FaultReportId = faultReports[0].Id, Message = "New high-priority fault assigned: Hydraulic leak on TC-AER", NotificationType = NotificationType.FaultAssigned, Date = DateTime.UtcNow.AddHours(-4) },
            new Notification { RecipientUserId = mroEngineer2.Id, FaultReportId = faultReports[1].Id, Message = "CRITICAL fault assigned: Engine vibration on TC-PLX", NotificationType = NotificationType.FaultAssigned, Date = DateTime.UtcNow.AddHours(-1) },
            new Notification { RecipientUserId = mroEngineer1.Id, Message = "CRITICAL: Part 'Landing Gear Assembly' (LG-737-002) on aircraft TC-AER has reached 18500/18000 hours threshold.", NotificationType = NotificationType.PartCriticalThreshold, Date = DateTime.UtcNow.AddDays(-2) },
            new Notification { RecipientUserId = mroEngineer1.Id, Message = "CRITICAL: Part 'GE90-115B Engine' (GE90-115B-001) on aircraft TC-SKY has reached 38000/35000 hours threshold.", NotificationType = NotificationType.PartCriticalThreshold, Date = DateTime.UtcNow.AddDays(-5) },
        };

        context.Notifications.AddRange(notifications);

        await context.SaveChangesAsync();
    }
}
