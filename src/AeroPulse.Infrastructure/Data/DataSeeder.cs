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

        context.Users.AddRange(adminUser, opsManager, mroEngineer1, mroEngineer2, fieldTech);

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

    public static async Task EnsureExtraDemoDataAsync(AeroPulseDbContext context)
    {
        var demoUsers = new[]
        {
            new User
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000007"),
                FullName = "Demo Engineer",
                Email = "demo.engineer@aeropulse.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Demo123!"),
                Role = UserRole.MROEngineer,
                IsActive = true
            },
            new User
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000008"),
                FullName = "Demo Operations",
                Email = "demo.ops@aeropulse.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Demo123!"),
                Role = UserRole.OperationsManager,
                IsActive = true
            }
        };

        try
        {
            await context.Database.ExecuteSqlRawAsync("DELETE FROM Users WHERE Email IN ('viewer@aeropulse.com', 'demo.viewer@aeropulse.com') OR Role = 4;");
        }
        catch { }

        foreach (var user in demoUsers)
        {
            var exists = await context.Users.AnyAsync(u => u.Email == user.Email);
            if (!exists)
            {
                context.Users.Add(user);
            }
        }

        var demoAircrafts = new[]
        {
            new Aircraft
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000006"),
                TailNumber = "TC-DEMO1",
                Model = "Airbus A321neo",
                ManufactureYear = 2023,
                StatusCode = AircraftStatus.Active,
                TotalFlightHours = 3200,
                Operator = "AeroPulse Airlines"
            },
            new Aircraft
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000007"),
                TailNumber = "TC-DEMO2",
                Model = "Boeing 787-9",
                ManufactureYear = 2024,
                StatusCode = AircraftStatus.Active,
                TotalFlightHours = 1800,
                Operator = "AeroPulse Airlines"
            }
        };

        foreach (var aircraft in demoAircrafts)
        {
            var exists = await context.Aircraft.AnyAsync(a => a.TailNumber == aircraft.TailNumber);
            if (!exists)
            {
                context.Aircraft.Add(aircraft);
            }
        }

        var demoOpsManager = await context.Users.FirstOrDefaultAsync(u => u.Email == "demo.ops@aeropulse.com");
        var demoAircraft1 = await context.Aircraft.FirstOrDefaultAsync(a => a.TailNumber == "TC-DEMO1");
        var demoAircraft2 = await context.Aircraft.FirstOrDefaultAsync(a => a.TailNumber == "TC-DEMO2");

        if (demoOpsManager is not null)
        {
            if (demoAircraft1 is not null && !await context.Operations.AnyAsync(o => o.FlightNumber == "AP777"))
            {
                context.Operations.Add(new Operation
                {
                    Id = Guid.Parse("60000000-0000-0000-0000-000000000005"),
                    AircraftId = demoAircraft1.Id,
                    GateNo = "D11",
                    ArrivalTime = DateTime.UtcNow.AddHours(3),
                    DepartureTime = DateTime.UtcNow.AddHours(7),
                    Status = OperationStatus.Scheduled,
                    FlightNumber = "AP777",
                    OperationsManagerId = demoOpsManager.Id
                });
            }

            if (demoAircraft2 is not null && !await context.Operations.AnyAsync(o => o.FlightNumber == "AP888"))
            {
                context.Operations.Add(new Operation
                {
                    Id = Guid.Parse("60000000-0000-0000-0000-000000000006"),
                    AircraftId = demoAircraft2.Id,
                    GateNo = "E07",
                    ArrivalTime = DateTime.UtcNow.AddHours(8),
                    DepartureTime = DateTime.UtcNow.AddHours(12),
                    Status = OperationStatus.Scheduled,
                    FlightNumber = "AP888",
                    OperationsManagerId = demoOpsManager.Id
                });
            }
        }

        await context.SaveChangesAsync();
    }

    public static async Task EnsureOperationalDataAsync(AeroPulseDbContext context)
    {
        // 1. ===== RUNWAYS =====
        if (!await context.Runways.AnyAsync())
        {
            context.Runways.AddRange(
                new Runway { Id = Guid.NewGuid(), RunwayCode = "35L", Status = RunwayStatus.Available, LengthMeters = 3750, SurfaceType = "Asphalt", StatusChangedAt = DateTime.UtcNow.AddMinutes(-30) },
                new Runway { Id = Guid.NewGuid(), RunwayCode = "35R", Status = RunwayStatus.LandingInProgress, LengthMeters = 3750, SurfaceType = "Asphalt", CurrentFlightNumber = "TK1984", StatusChangedAt = DateTime.UtcNow.AddMinutes(-3) },
                new Runway { Id = Guid.NewGuid(), RunwayCode = "17L", Status = RunwayStatus.Available, LengthMeters = 4100, SurfaceType = "Concrete", StatusChangedAt = DateTime.UtcNow.AddHours(-1) },
                new Runway { Id = Guid.NewGuid(), RunwayCode = "17R", Status = RunwayStatus.TakeoffInProgress, LengthMeters = 3750, SurfaceType = "Asphalt", CurrentFlightNumber = "PC2024", StatusChangedAt = DateTime.UtcNow.AddMinutes(-1) },
                new Runway { Id = Guid.NewGuid(), RunwayCode = "18/36", Status = RunwayStatus.ClosedForMaintenance, LengthMeters = 3500, SurfaceType = "Asphalt", StatusChangedAt = DateTime.UtcNow.AddDays(-1) }
            );
            await context.SaveChangesAsync();
        }

        // 2. ===== GATES =====
        if (!await context.Gates.AnyAsync())
        {
            var firstAircraft = await context.Aircraft.FirstOrDefaultAsync();
            context.Gates.AddRange(
                new Gate { Id = Guid.NewGuid(), GateNumber = "A1", TerminalCode = "T1", HasJetBridge = true, Status = GateStatus.Occupied, CurrentFlightNumber = "TK1984", CurrentAircraftId = firstAircraft?.Id },
                new Gate { Id = Guid.NewGuid(), GateNumber = "A2", TerminalCode = "T1", HasJetBridge = true, Status = GateStatus.Available },
                new Gate { Id = Guid.NewGuid(), GateNumber = "A3", TerminalCode = "T1", HasJetBridge = true, Status = GateStatus.Reserved, CurrentFlightNumber = "AP777" },
                new Gate { Id = Guid.NewGuid(), GateNumber = "B1", TerminalCode = "T1", HasJetBridge = true, Status = GateStatus.Occupied, CurrentFlightNumber = "PC2024" },
                new Gate { Id = Guid.NewGuid(), GateNumber = "B2", TerminalCode = "T1", HasJetBridge = true, Status = GateStatus.Available },
                new Gate { Id = Guid.NewGuid(), GateNumber = "B4", TerminalCode = "T1", HasJetBridge = true, Status = GateStatus.Available },
                new Gate { Id = Guid.NewGuid(), GateNumber = "Stand-101", TerminalCode = "T1", HasJetBridge = false, Status = GateStatus.Available },
                new Gate { Id = Guid.NewGuid(), GateNumber = "Stand-102", TerminalCode = "T1", HasJetBridge = false, Status = GateStatus.Occupied, CurrentFlightNumber = "AP888" }
            );
            await context.SaveChangesAsync();
        }

        // ===== JET BRIDGES =====
        if (!await context.JetBridges.AnyAsync())
        {
            var op = await context.Operations.FirstOrDefaultAsync();
            var aircraft = await context.Aircraft.FirstOrDefaultAsync();
            var jb1 = new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000001"), BridgeNo = "JB-01", TerminalNo = "T1", StatusCode = JetBridgeStatus.Connected };
            var jb2 = new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000002"), BridgeNo = "JB-02", TerminalNo = "T1", StatusCode = JetBridgeStatus.Available };
            var jb3 = new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000003"), BridgeNo = "JB-03", TerminalNo = "T1", StatusCode = JetBridgeStatus.UnderMaintenance };
            var jb4 = new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000004"), BridgeNo = "JB-04", TerminalNo = "T2", StatusCode = JetBridgeStatus.Available };
            var jb5 = new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000005"), BridgeNo = "JB-05", TerminalNo = "T2", StatusCode = JetBridgeStatus.Reserved };
            var jb6 = new JetBridge { Id = Guid.Parse("70000000-0000-0000-0000-000000000006"), BridgeNo = "JB-06", TerminalNo = "T1", StatusCode = JetBridgeStatus.Available };
            context.JetBridges.AddRange(jb1, jb2, jb3, jb4, jb5, jb6);
            if (op != null && aircraft != null)
            {
                context.JetBridgeAssignments.Add(new JetBridgeAssignment
                {
                    Id = Guid.Parse("80000000-0000-0000-0000-000000000001"),
                    JetBridgeId = jb1.Id,
                    AircraftId = aircraft.Id,
                    OperationId = op.Id,
                    EstimatedArrivalTime = DateTime.UtcNow.AddHours(-1),
                    ActualArrivalTime = DateTime.UtcNow.AddHours(-1).AddMinutes(5),
                    ConnectionTime = DateTime.UtcNow.AddHours(-1).AddMinutes(10),
                    PassengerCount = 186,
                    Status = JetBridgeAssignmentStatus.BridgeConnected
                });
            }
            await context.SaveChangesAsync();
        }

        // 3. ===== GSE (Yer Destek Ekipmanları) =====
        if (!await context.GroundSupportEquipments.AnyAsync())
        {
            context.GroundSupportEquipments.AddRange(
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "BUS-01", Name = "Cobus 3000 Yolcu Otobüsü #1", Type = GSEType.PassengerBus, Status = GSEStatus.Idle, FuelLevelPercentage = 92, ApronZone = "Terminal 1 Ramp", OperatorName = "Ahmet Yılmaz", Latitude = 41.2753, Longitude = 28.7519 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "BUS-02", Name = "Cobus 3000 Yolcu Otobüsü #2", Type = GSEType.PassengerBus, Status = GSEStatus.Busy, FuelLevelPercentage = 64, ApronZone = "Stand-102", OperatorName = "Mehmet Demir", CurrentTaskDescription = "AP888 Yolcu Transferi", Latitude = 41.2760, Longitude = 28.7530 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "BUS-03", Name = "Cobus 2700 Yolcu Otobüsü #3", Type = GSEType.PassengerBus, Status = GSEStatus.OutOfService, FuelLevelPercentage = 20, ApronZone = "Bakım Hangarı", OperatorName = "Serviste", CurrentTaskDescription = "Fren sistemi revizyonu", Latitude = 41.2710, Longitude = 28.7480 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "TANKER-01", Name = "Jet A-1 Yakıt Tankeri 35.000L", Type = GSEType.FuelTanker, Status = GSEStatus.Busy, FuelLevelPercentage = 78, ApronZone = "Gate A1", OperatorName = "Can Kılıç", CurrentTaskDescription = "TK1984 Yakıt İkmali (8.500 kg)", Latitude = 41.2748, Longitude = 28.7512 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "TANKER-02", Name = "Jet A-1 Yakıt Tankeri 25.000L", Type = GSEType.FuelTanker, Status = GSEStatus.Idle, FuelLevelPercentage = 95, ApronZone = "Güney Yakıt Deposu", OperatorName = "Emre Ak", Latitude = 41.2705, Longitude = 28.7550 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "TUG-01", Name = "Charlatte Bagaj Traktörü #1", Type = GSEType.BaggageTug, Status = GSEStatus.Busy, FuelLevelPercentage = 85, ApronZone = "Gate A1", OperatorName = "Ali Kaya", CurrentTaskDescription = "TK1984 Bagaj Yükleme", Latitude = 41.2747, Longitude = 28.7515 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "TUG-02", Name = "Charlatte Bagaj Traktörü #2", Type = GSEType.BaggageTug, Status = GSEStatus.Idle, FuelLevelPercentage = 90, ApronZone = "Bagaj Tasnif Alanı", OperatorName = "Hasan Çelik", Latitude = 41.2730, Longitude = 28.7525 },
                new GroundSupportEquipment { Id = Guid.NewGuid(), Code = "PUSHBACK-01", Name = "Trepel Towbarless Pushback", Type = GSEType.PushbackTruck, Status = GSEStatus.Idle, FuelLevelPercentage = 80, ApronZone = "Gate A2", OperatorName = "Murat Polat", Latitude = 41.2745, Longitude = 28.7510 }
            );
            await context.SaveChangesAsync();
        }

        // 4. ===== TURNAROUND TASKS & MANIFEST =====
        var activeOp = await context.Operations.FirstOrDefaultAsync(o => o.Status == OperationStatus.InProgress)
                    ?? await context.Operations.FirstOrDefaultAsync();

        if (activeOp != null && !await context.TurnaroundTasks.AnyAsync(t => t.OperationId == activeOp.Id))
        {
            var tanker = await context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Code == "TANKER-01");
            var tug = await context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Code == "TUG-01");
            var pushback = await context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Code == "PUSHBACK-01");
            var technician = await context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.FieldTechnician);

            context.TurnaroundTasks.AddRange(
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.BaggageUnload,
                    Status = TurnaroundTaskStatus.Completed,
                    TargetDurationMinutes = 20,
                    ScheduledStartTime = activeOp.ArrivalTime,
                    ActualStartTime = activeOp.ArrivalTime,
                    ActualEndTime = activeOp.ArrivalTime.AddMinutes(18),
                    ProgressPercentage = 100,
                    Notes = "Tüm gelen bagajlar boşaltıldı ve tasnif bandına aktarıldı."
                },
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.Refueling,
                    Status = TurnaroundTaskStatus.InProgress,
                    TargetDurationMinutes = 25,
                    ScheduledStartTime = activeOp.ArrivalTime.AddMinutes(15),
                    ActualStartTime = activeOp.ArrivalTime.AddMinutes(15),
                    ProgressPercentage = 65,
                    AssignedGSEId = tanker?.Id,
                    Notes = "Hedef: 8.500 kg Jet A-1. Mevcut: 5.500 kg basıldı."
                },
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.Cleaning,
                    Status = TurnaroundTaskStatus.Completed,
                    TargetDurationMinutes = 20,
                    ScheduledStartTime = activeOp.ArrivalTime.AddMinutes(10),
                    ActualStartTime = activeOp.ArrivalTime.AddMinutes(10),
                    ActualEndTime = activeOp.ArrivalTime.AddMinutes(28),
                    ProgressPercentage = 100,
                    Notes = "Kabin dezenfeksiyonu ve çöp toplama tamamlandı."
                },
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.Catering,
                    Status = TurnaroundTaskStatus.InProgress,
                    TargetDurationMinutes = 20,
                    ScheduledStartTime = activeOp.ArrivalTime.AddMinutes(20),
                    ActualStartTime = activeOp.ArrivalTime.AddMinutes(22),
                    ProgressPercentage = 80,
                    Notes = "Galley arabaları ve ikram paketleri yükleniyor."
                },
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.BaggageLoad,
                    Status = TurnaroundTaskStatus.InProgress,
                    TargetDurationMinutes = 25,
                    ScheduledStartTime = activeOp.ArrivalTime.AddMinutes(25),
                    ActualStartTime = activeOp.ArrivalTime.AddMinutes(25),
                    ProgressPercentage = 45,
                    AssignedGSEId = tug?.Id,
                    AssignedUserId = technician?.Id,
                    Notes = "Giden bagajlar ön ve arka ambara yükleniyor (130/154 adet)."
                },
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.Boarding,
                    Status = TurnaroundTaskStatus.InProgress,
                    TargetDurationMinutes = 30,
                    ScheduledStartTime = activeOp.DepartureTime.AddMinutes(-35),
                    ActualStartTime = activeOp.DepartureTime.AddMinutes(-35),
                    ProgressPercentage = 70,
                    Notes = "Öncelikli yolcular ve grup 1-2 binişi tamamlandı (162/180 yolcu)."
                },
                new TurnaroundTask
                {
                    Id = Guid.NewGuid(),
                    OperationId = activeOp.Id,
                    TaskType = TurnaroundTaskType.Pushback,
                    Status = TurnaroundTaskStatus.Pending,
                    TargetDurationMinutes = 10,
                    ScheduledStartTime = activeOp.DepartureTime,
                    ProgressPercentage = 0,
                    AssignedGSEId = pushback?.Id,
                    Notes = "Körük ayrıldıktan ve takozlar alındıktan sonra başlayacak."
                }
            );

            // Manifest
            context.PassengerManifests.Add(new PassengerManifest
            {
                Id = Guid.NewGuid(),
                OperationId = activeOp.Id,
                FlightNumber = activeOp.FlightNumber,
                Destination = "Frankfurt (FRA)",
                GateNo = activeOp.GateNo,
                TotalBooked = 180,
                BoardedCount = 162,
                CheckedBaggageCount = 154,
                LoadedBaggageCount = 130,
                BoardingStatus = BoardingStatus.Boarding,
                LuggageMatchComplete = false,
                LoadsheetApproved = false,
                ApprovedByRedcap = "Sarah Operations"
            });

            await context.SaveChangesAsync();
        }
    }

    public static async Task EnsureTenantDataAsync(AeroPulseDbContext context)
    {
        // 1. Dinamik SQLite Şema Güvencesi: Tablolar ve Kolonlar var mı kontrol et
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS ""Tenants"" (
                    ""Id"" TEXT NOT NULL PRIMARY KEY,
                    ""Code"" TEXT NOT NULL,
                    ""Name"" TEXT NOT NULL,
                    ""Type"" INTEGER NOT NULL,
                    ""PrimaryColor"" TEXT NOT NULL,
                    ""LogoUrl"" TEXT NULL,
                    ""IsActive"" INTEGER NOT NULL,
                    ""ContactEmail"" TEXT NULL,
                    ""Description"" TEXT NULL,
                    ""CreatedAt"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NULL
                );
            ");

            string[] tables = { "Aircraft", "Operations", "GroundSupportEquipments", "TurnaroundTasks", "FaultReports", "PassengerManifests", "Users" };
            foreach (var table in tables)
            {
                try
                {
                    await context.Database.ExecuteSqlRawAsync($@"ALTER TABLE ""{table}"" ADD COLUMN ""TenantId"" TEXT NULL;");
                }
                catch
                {
                    // Kolon zaten varsa SQLite hata fırlatır, bu beklenen ve güvenli bir durumdur.
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Tenant Schema Check] {ex.Message}");
        }

        // 2. 5 Temel Havayolu ve Yer Hizmetleri Kiracılarını Ekle
        var thyId = Guid.Parse("a0000000-0000-0000-0000-000000000001");
        var pgsId = Guid.Parse("a0000000-0000-0000-0000-000000000002");
        var tgsId = Guid.Parse("a0000000-0000-0000-0000-000000000003");
        var clbId = Guid.Parse("a0000000-0000-0000-0000-000000000004");
        var igaId = Guid.Parse("a0000000-0000-0000-0000-000000000005");
        var sxsId = Guid.Parse("a0000000-0000-0000-0000-000000000006");
        var ajtId = Guid.Parse("a0000000-0000-0000-0000-000000000007");
        var dlhId = Guid.Parse("a0000000-0000-0000-0000-000000000008");

        var tenantsToSeed = new[]
        {
            new Tenant
            {
                Id = thyId,
                Code = "THY",
                Name = "Türk Hava Yolları",
                Type = TenantType.Airline,
                PrimaryColor = "#e30a17",
                Description = "Türkiye'nin bayrak taşıyıcı havayolu şirketi (TK)",
                ContactEmail = "occ@thy.com"
            },
            new Tenant
            {
                Id = pgsId,
                Code = "PGS",
                Name = "Pegasus Airlines",
                Type = TenantType.Airline,
                PrimaryColor = "#f59e0b",
                Description = "Türkiye'nin lider düşük maliyetli havayolu şirketi (PC)",
                ContactEmail = "ops@flypgs.com"
            },
            new Tenant
            {
                Id = sxsId,
                Code = "SXS",
                Name = "SunExpress",
                Type = TenantType.Airline,
                PrimaryColor = "#f97316",
                Description = "Tatil ve turizm odaklı uluslararası havayolu (XQ)",
                ContactEmail = "ops@sunexpress.com"
            },
            new Tenant
            {
                Id = ajtId,
                Code = "AJT",
                Name = "AJet (AnadoluJet)",
                Type = TenantType.Airline,
                PrimaryColor = "#0284c7",
                Description = "Türkiye içi ve bölgesel ekonomik havayolu (VF)",
                ContactEmail = "occ@ajet.com"
            },
            new Tenant
            {
                Id = dlhId,
                Code = "DLH",
                Name = "Lufthansa",
                Type = TenantType.Airline,
                PrimaryColor = "#0f172a",
                Description = "Almanya bayrak taşıyıcısı ve Star Alliance üyesi (LH)",
                ContactEmail = "operations@lufthansa.com"
            },
            new Tenant
            {
                Id = tgsId,
                Code = "TGS",
                Name = "Turkish Ground Services",
                Type = TenantType.GroundHandler,
                PrimaryColor = "#2563eb",
                Description = "Apron ramp, otobüs ve bagaj yer hizmetleri taşeronu",
                ContactEmail = "ramp@tgs.aero"
            },
            new Tenant
            {
                Id = clbId,
                Code = "CLB",
                Name = "Çelebi Havacılık",
                Type = TenantType.GroundHandler,
                PrimaryColor = "#10b981",
                Description = "Apron yakıt ikmali, de-icing ve yer destek hizmetleri",
                ContactEmail = "operations@celebiaviation.com"
            },
            new Tenant
            {
                Id = igaId,
                Code = "IGA",
                Name = "İGA / Havalimanı Otoritesi",
                Type = TenantType.AirportAuthority,
                PrimaryColor = "#8b5cf6",
                Description = "Havalimanı Operasyon Kontrol Merkezi (OCC) & Genel Bakış",
                ContactEmail = "occ@igairport.com"
            }
        };

        foreach (var tenant in tenantsToSeed)
        {
            var existing = await context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Code == tenant.Code);
            if (existing == null)
            {
                context.Tenants.Add(tenant);
            }
        }
        await context.SaveChangesAsync();

        // 3. Havayolları Veri Desteği (Uçaklar, Seferler, Ramp Görevleri, Arızalar ve MRO Bakım)
        try
        {
            var engineer = await context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.MROEngineer);
            var technician = await context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.FieldTechnician);
            var tanker = await context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Code == "TANKER-01");
            var tug = await context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Code == "TUG-01");
            var pushback = await context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Code == "PUSHBACK-01");

            // --- A. TÜRK HAVA YOLLARI (THY) ---
            var thyPlanes = new[]
            {
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-LGA", Model = "Airbus A350-900", ManufactureYear = 2021, StatusCode = AircraftStatus.Active, TotalFlightHours = 9400, Operator = "Türk Hava Yolları", TenantId = thyId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-JRO", Model = "Airbus A321neo", ManufactureYear = 2022, StatusCode = AircraftStatus.Active, TotalFlightHours = 4800, Operator = "Türk Hava Yolları", TenantId = thyId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-JFH", Model = "Boeing 737-800", ManufactureYear = 2018, StatusCode = AircraftStatus.InMaintenance, TotalFlightHours = 18200, Operator = "Türk Hava Yolları", TenantId = thyId }
            };
            foreach (var p in thyPlanes)
            {
                if (!await context.Aircraft.IgnoreQueryFilters().AnyAsync(a => a.TailNumber == p.TailNumber))
                    context.Aircraft.Add(p);
            }
            await context.SaveChangesAsync();

            // --- B. PEGASUS AIRLINES (PGS) ---
            var pgsPlanes = new[]
            {
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-PGX", Model = "Airbus A321neo", ManufactureYear = 2022, StatusCode = AircraftStatus.Active, TotalFlightHours = 6400, Operator = "Pegasus Airlines", TenantId = pgsId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-RBA", Model = "Boeing 737-800", ManufactureYear = 2019, StatusCode = AircraftStatus.Active, TotalFlightHours = 14200, Operator = "Pegasus Airlines", TenantId = pgsId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-CPY", Model = "Airbus A320neo", ManufactureYear = 2020, StatusCode = AircraftStatus.InMaintenance, TotalFlightHours = 11200, Operator = "Pegasus Airlines", TenantId = pgsId }
            };
            foreach (var p in pgsPlanes)
            {
                if (!await context.Aircraft.IgnoreQueryFilters().AnyAsync(a => a.TailNumber == p.TailNumber))
                    context.Aircraft.Add(p);
            }
            await context.SaveChangesAsync();

            // --- C. SUNEXPRESS (SXS) ---
            var sxsPlanes = new[]
            {
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-SOA", Model = "Boeing 737-800", ManufactureYear = 2020, StatusCode = AircraftStatus.Active, TotalFlightHours = 8900, Operator = "SunExpress", TenantId = sxsId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-SEZ", Model = "Boeing 737 MAX 8", ManufactureYear = 2023, StatusCode = AircraftStatus.Active, TotalFlightHours = 3100, Operator = "SunExpress", TenantId = sxsId }
            };
            foreach (var p in sxsPlanes)
            {
                if (!await context.Aircraft.IgnoreQueryFilters().AnyAsync(a => a.TailNumber == p.TailNumber))
                    context.Aircraft.Add(p);
            }
            await context.SaveChangesAsync();

            // --- D. AJET (AJT) ---
            var ajtPlanes = new[]
            {
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-JVD", Model = "Boeing 737-800", ManufactureYear = 2019, StatusCode = AircraftStatus.Active, TotalFlightHours = 12500, Operator = "AJet", TenantId = ajtId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "TC-JVF", Model = "Airbus A320neo", ManufactureYear = 2021, StatusCode = AircraftStatus.Active, TotalFlightHours = 7400, Operator = "AJet", TenantId = ajtId }
            };
            foreach (var p in ajtPlanes)
            {
                if (!await context.Aircraft.IgnoreQueryFilters().AnyAsync(a => a.TailNumber == p.TailNumber))
                    context.Aircraft.Add(p);
            }
            await context.SaveChangesAsync();

            // --- E. LUFTHANSA (DLH) ---
            var dlhPlanes = new[]
            {
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "D-AIXP", Model = "Airbus A350-900", ManufactureYear = 2020, StatusCode = AircraftStatus.Active, TotalFlightHours = 10100, Operator = "Lufthansa", TenantId = dlhId },
                new Aircraft { Id = Guid.NewGuid(), TailNumber = "D-AINZ", Model = "Airbus A320neo", ManufactureYear = 2022, StatusCode = AircraftStatus.Active, TotalFlightHours = 5200, Operator = "Lufthansa", TenantId = dlhId }
            };
            foreach (var p in dlhPlanes)
            {
                if (!await context.Aircraft.IgnoreQueryFilters().AnyAsync(a => a.TailNumber == p.TailNumber))
                    context.Aircraft.Add(p);
            }
            await context.SaveChangesAsync();

            // --- OPERASYONLAR (UÇUŞLAR) ---
            var tkPlane1 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "TC-LGA");
            var tkPlane2 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "TC-JRO");
            var pgPlane1 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "TC-PGX");
            var pgPlane2 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "TC-RBA");
            var sxPlane1 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "TC-SOA");
            var ajPlane1 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "TC-JVD");
            var lhPlane1 = await context.Aircraft.IgnoreQueryFilters().FirstAsync(a => a.TailNumber == "D-AIXP");

            var flights = new[]
            {
                // THY Uçuşları
                new Operation { Id = Guid.NewGuid(), AircraftId = tkPlane1.Id, FlightNumber = "TK1984", GateNo = "A1", AssignedRunwayCode = "35R", ArrivalTime = DateTime.UtcNow.AddMinutes(-40), DepartureTime = DateTime.UtcNow.AddMinutes(50), Status = OperationStatus.InProgress, TenantId = thyId },
                new Operation { Id = Guid.NewGuid(), AircraftId = tkPlane2.Id, FlightNumber = "TK2026", GateNo = "A2", AssignedRunwayCode = "35L", ArrivalTime = DateTime.UtcNow.AddMinutes(45), DepartureTime = DateTime.UtcNow.AddMinutes(135), Status = OperationStatus.Scheduled, TenantId = thyId },
                new Operation { Id = Guid.NewGuid(), AircraftId = tkPlane1.Id, FlightNumber = "TK1453", GateNo = "A3", AssignedRunwayCode = "17L", ArrivalTime = DateTime.UtcNow.AddMinutes(-90), DepartureTime = DateTime.UtcNow.AddMinutes(30), Status = OperationStatus.Delayed, DelayMinutes = 35, DelayReason = "Geç gelen uçak bağlantısı", TenantId = thyId },

                // Pegasus Uçuşları
                new Operation { Id = Guid.NewGuid(), AircraftId = pgPlane1.Id, FlightNumber = "PC202", GateNo = "B1", AssignedRunwayCode = "35L", ArrivalTime = DateTime.UtcNow.AddMinutes(-25), DepartureTime = DateTime.UtcNow.AddMinutes(45), Status = OperationStatus.InProgress, TenantId = pgsId },
                new Operation { Id = Guid.NewGuid(), AircraftId = pgPlane2.Id, FlightNumber = "PC303", GateNo = "B2", AssignedRunwayCode = "17R", ArrivalTime = DateTime.UtcNow.AddMinutes(30), DepartureTime = DateTime.UtcNow.AddMinutes(90), Status = OperationStatus.Scheduled, TenantId = pgsId },
                new Operation { Id = Guid.NewGuid(), AircraftId = pgPlane1.Id, FlightNumber = "PC404", GateNo = "B4", AssignedRunwayCode = "35R", ArrivalTime = DateTime.UtcNow.AddHours(-3), DepartureTime = DateTime.UtcNow.AddHours(-1), Status = OperationStatus.Completed, TenantId = pgsId },

                // SunExpress Uçuşları
                new Operation { Id = Guid.NewGuid(), AircraftId = sxPlane1.Id, FlightNumber = "XQ101", GateNo = "C1", AssignedRunwayCode = "35L", ArrivalTime = DateTime.UtcNow.AddMinutes(-20), DepartureTime = DateTime.UtcNow.AddMinutes(55), Status = OperationStatus.InProgress, TenantId = sxsId },
                new Operation { Id = Guid.NewGuid(), AircraftId = sxPlane1.Id, FlightNumber = "XQ202", GateNo = "C2", AssignedRunwayCode = "17L", ArrivalTime = DateTime.UtcNow.AddMinutes(60), DepartureTime = DateTime.UtcNow.AddMinutes(130), Status = OperationStatus.Scheduled, TenantId = sxsId },

                // AJet Uçuşları
                new Operation { Id = Guid.NewGuid(), AircraftId = ajPlane1.Id, FlightNumber = "VF401", GateNo = "D1", AssignedRunwayCode = "35R", ArrivalTime = DateTime.UtcNow.AddMinutes(-30), DepartureTime = DateTime.UtcNow.AddMinutes(40), Status = OperationStatus.InProgress, TenantId = ajtId },
                new Operation { Id = Guid.NewGuid(), AircraftId = ajPlane1.Id, FlightNumber = "VF502", GateNo = "D2", AssignedRunwayCode = "17R", ArrivalTime = DateTime.UtcNow.AddHours(1), DepartureTime = DateTime.UtcNow.AddHours(2), Status = OperationStatus.Scheduled, TenantId = ajtId },

                // Lufthansa Uçuşları
                new Operation { Id = Guid.NewGuid(), AircraftId = lhPlane1.Id, FlightNumber = "LH1300", GateNo = "E1", AssignedRunwayCode = "35L", ArrivalTime = DateTime.UtcNow.AddMinutes(-35), DepartureTime = DateTime.UtcNow.AddMinutes(50), Status = OperationStatus.InProgress, TenantId = dlhId },
                new Operation { Id = Guid.NewGuid(), AircraftId = lhPlane1.Id, FlightNumber = "LH1305", GateNo = "E2", AssignedRunwayCode = "17L", ArrivalTime = DateTime.UtcNow.AddHours(2), DepartureTime = DateTime.UtcNow.AddHours(3), Status = OperationStatus.Scheduled, TenantId = dlhId }
            };

            foreach (var fl in flights)
            {
                var existing = await context.Operations.IgnoreQueryFilters().FirstOrDefaultAsync(o => o.FlightNumber == fl.FlightNumber);
                if (existing == null)
                {
                    context.Operations.Add(fl);
                }
                else
                {
                    existing.TenantId = fl.TenantId;
                    existing.GateNo = fl.GateNo;
                    existing.Status = fl.Status;
                }
            }
            await context.SaveChangesAsync();

            // --- RAMP TURNAROUND GÖREVLERİ & YOLCU MANİFESTOSU ---
            var inProgressFlights = await context.Operations.IgnoreQueryFilters()
                .Where(o => o.Status == OperationStatus.InProgress)
                .ToListAsync();

            foreach (var op in inProgressFlights)
            {
                if (!await context.TurnaroundTasks.IgnoreQueryFilters().AnyAsync(t => t.OperationId == op.Id))
                {
                    context.TurnaroundTasks.AddRange(
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.BaggageUnload,
                            Status = TurnaroundTaskStatus.Completed,
                            TargetDurationMinutes = 20,
                            ScheduledStartTime = op.ArrivalTime,
                            ActualStartTime = op.ArrivalTime,
                            ActualEndTime = op.ArrivalTime.AddMinutes(18),
                            ProgressPercentage = 100,
                            Notes = $"{op.FlightNumber} gelen bagajlar boşaltıldı."
                        },
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.Refueling,
                            Status = TurnaroundTaskStatus.InProgress,
                            TargetDurationMinutes = 25,
                            ScheduledStartTime = op.ArrivalTime.AddMinutes(10),
                            ActualStartTime = op.ArrivalTime.AddMinutes(12),
                            ProgressPercentage = 75,
                            AssignedGSEId = tanker?.Id,
                            Notes = $"{op.FlightNumber} için 6.800 kg Jet A-1 ikmali devam ediyor."
                        },
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.Cleaning,
                            Status = TurnaroundTaskStatus.Completed,
                            TargetDurationMinutes = 20,
                            ScheduledStartTime = op.ArrivalTime.AddMinutes(5),
                            ActualStartTime = op.ArrivalTime.AddMinutes(5),
                            ActualEndTime = op.ArrivalTime.AddMinutes(22),
                            ProgressPercentage = 100,
                            Notes = "Kabin temizliği ve dezenfeksiyon tamamlandı."
                        },
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.Catering,
                            Status = TurnaroundTaskStatus.InProgress,
                            TargetDurationMinutes = 20,
                            ScheduledStartTime = op.ArrivalTime.AddMinutes(15),
                            ActualStartTime = op.ArrivalTime.AddMinutes(18),
                            ProgressPercentage = 85,
                            Notes = "İkram servis arabaları kabine yüklendi."
                        },
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.BaggageLoad,
                            Status = TurnaroundTaskStatus.InProgress,
                            TargetDurationMinutes = 25,
                            ScheduledStartTime = op.ArrivalTime.AddMinutes(20),
                            ActualStartTime = op.ArrivalTime.AddMinutes(22),
                            ProgressPercentage = 60,
                            AssignedGSEId = tug?.Id,
                            AssignedUserId = technician?.Id,
                            Notes = "Giden bagajlar kargoya yükleniyor."
                        },
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.Boarding,
                            Status = TurnaroundTaskStatus.InProgress,
                            TargetDurationMinutes = 30,
                            ScheduledStartTime = op.DepartureTime.AddMinutes(-35),
                            ActualStartTime = op.DepartureTime.AddMinutes(-35),
                            ProgressPercentage = 65,
                            Notes = "Yolcu alımı devam ediyor."
                        },
                        new TurnaroundTask
                        {
                            Id = Guid.NewGuid(),
                            OperationId = op.Id,
                            TenantId = op.TenantId,
                            TaskType = TurnaroundTaskType.Pushback,
                            Status = TurnaroundTaskStatus.Pending,
                            TargetDurationMinutes = 10,
                            ScheduledStartTime = op.DepartureTime,
                            ProgressPercentage = 0,
                            AssignedGSEId = pushback?.Id,
                            Notes = "Körük ayrılışı sonrası hazır bekliyor."
                        }
                    );
                }

                if (!await context.PassengerManifests.IgnoreQueryFilters().AnyAsync(m => m.OperationId == op.Id))
                {
                    context.PassengerManifests.Add(new PassengerManifest
                    {
                        Id = Guid.NewGuid(),
                        OperationId = op.Id,
                        FlightNumber = op.FlightNumber,
                        Destination = op.FlightNumber.StartsWith("TK") ? "Londra LHR" :
                                      op.FlightNumber.StartsWith("PC") ? "Paris CDG" :
                                      op.FlightNumber.StartsWith("XQ") ? "Frankfurt FRA" :
                                      op.FlightNumber.StartsWith("VF") ? "Trabzon TZX" : "Münih MUC",
                        GateNo = op.GateNo,
                        TotalBooked = 186,
                        BoardedCount = 142,
                        CheckedBaggageCount = 160,
                        LoadedBaggageCount = 120,
                        BoardingStatus = BoardingStatus.Boarding,
                        LuggageMatchComplete = false,
                        LoadsheetApproved = false,
                        ApprovedByRedcap = "Sarah Operations"
                    });
                }
            }
            await context.SaveChangesAsync();

            // --- ARIZA RAPORLARI (TEKNİK SERVİS) ---
            var faultSeed = new[]
            {
                new { Tail = "TC-JFH", Desc = "Sol motor hidrolik basınç regülatöründe aralıklarla basınç düşüşü gözlendi.", Priority = Priority.Critical, TenantId = thyId },
                new { Tail = "TC-CPY", Desc = "Burun iniş takımı pozisyon gösterge mikro-anahtarı arızalı, kontrol gerekli.", Priority = Priority.High, TenantId = pgsId },
                new { Tail = "TC-SOA", Desc = "Kabin iklimlendirme pack-1 akış regülatörü ayar kontrolü.", Priority = Priority.Medium, TenantId = sxsId },
                new { Tail = "TC-JVD", Desc = "Yardımcı güç ünitesi (APU) yağ seviyesi düşük uyarısı.", Priority = Priority.High, TenantId = ajtId },
                new { Tail = "D-AINZ", Desc = "Fren sıcaklık sensörü aralıklı sinyal kesintisi.", Priority = Priority.Medium, TenantId = dlhId }
            };

            foreach (var item in faultSeed)
            {
                var plane = await context.Aircraft.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.TailNumber == item.Tail);
                if (plane != null && !await context.FaultReports.IgnoreQueryFilters().AnyAsync(f => f.AircraftId == plane.Id))
                {
                    context.FaultReports.Add(new FaultReport
                    {
                        Id = Guid.NewGuid(),
                        AircraftId = plane.Id,
                        Description = item.Desc,
                        Priority = item.Priority,
                        Status = FaultStatus.Open,
                        OpenDate = DateTime.UtcNow.AddHours(-3),
                        TenantId = item.TenantId,
                        ReportedByTechnicianId = technician?.Id ?? Guid.Parse("10000000-0000-0000-0000-000000000005")
                    });
                }
            }
            await context.SaveChangesAsync();

            // --- MRO PARÇA VE BAKIM KAYITLARI (MÜHENDİSLİK) ---
            var allPlanes = await context.Aircraft.IgnoreQueryFilters().ToListAsync();
            foreach (var p in allPlanes)
            {
                if (!await context.Parts.AnyAsync(part => part.AircraftId == p.Id))
                {
                    var part1 = new Part
                    {
                        Id = Guid.NewGuid(),
                        AircraftId = p.Id,
                        PartName = $"{p.Model} Ana İniş Takımı Amortisör Paketi",
                        PartNumber = $"LG-{p.TailNumber.Replace("-", "")}-01",
                        LifeSpanHours = 20000,
                        UsedHours = (int)(p.TotalFlightHours * 0.9),
                        CriticalThresholdHours = 18000,
                        Manufacturer = "Safran Landing Systems",
                        Location = "Ana Hangarı Raf B-12",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow.AddMonths(-12)
                    };
                    var part2 = new Part
                    {
                        Id = Guid.NewGuid(),
                        AircraftId = p.Id,
                        PartName = $"{p.Model} CFM LEAP-1 / GE Motor Türbini Bıçağı",
                        PartNumber = $"ENG-{p.TailNumber.Replace("-", "")}-02",
                        LifeSpanHours = 15000,
                        UsedHours = (int)(p.TotalFlightHours * 0.85),
                        CriticalThresholdHours = 13500,
                        Manufacturer = "CFM International",
                        Location = "Motor Deposu A-04",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow.AddMonths(-6)
                    };
                    context.Parts.AddRange(part1, part2);
                    await context.SaveChangesAsync();

                    if (engineer != null)
                    {
                        context.MaintenanceRecords.AddRange(
                            new MaintenanceRecord
                            {
                                Id = Guid.NewGuid(),
                                AircraftId = p.Id,
                                PartId = part1.Id,
                                EngineerId = engineer.Id,
                                MaintenanceType = MaintenanceType.Scheduled,
                                WorkPerformed = $"{p.TailNumber} A-Check 500 saatlik genel gövde ve hidrolik muayenesi tamamlandı.",
                                CertificateNo = $"CERT-MRO-{DateTime.UtcNow.Year}-{(int)p.TotalFlightHours % 999:D3}",
                                Date = DateTime.UtcNow.AddDays(-10),
                                NextScheduledDate = DateTime.UtcNow.AddDays(20),
                                Notes = "Uçuşa elverişlilik sertifikası onaylandı."
                            },
                            new MaintenanceRecord
                            {
                                Id = Guid.NewGuid(),
                                AircraftId = p.Id,
                                PartId = part2.Id,
                                EngineerId = engineer.Id,
                                MaintenanceType = MaintenanceType.Overhaul,
                                WorkPerformed = $"{p.TailNumber} motor boroskop kontrolü ve yakıt nozul temizliği yapıldı.",
                                CertificateNo = $"CERT-ENG-{DateTime.UtcNow.Year}-{(int)p.TotalFlightHours % 888:D3}",
                                Date = DateTime.UtcNow.AddDays(-3),
                                NextScheduledDate = DateTime.UtcNow.AddDays(5),
                                Notes = "7 gün içerisinde periyodik titreşim analizi tekrarlanacak."
                            }
                        );
                    }
                }
            }
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Tenant Data Assignment] {ex.Message}");
        }
    }
}
