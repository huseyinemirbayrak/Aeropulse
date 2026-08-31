using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Infrastructure.Data;

public static class StoredProceduresAndViews
{
    public static async Task CreateStoredProceduresAndViewsAsync(AeroPulseDbContext context)
    {
        // View: vw_ActiveFaultReports
        await context.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID('vw_ActiveFaultReports', 'V') IS NOT NULL
                DROP VIEW vw_ActiveFaultReports;
        ");

        await context.Database.ExecuteSqlRawAsync(@"
            CREATE VIEW vw_ActiveFaultReports AS
            SELECT 
                fr.Id,
                fr.Description,
                fr.Priority,
                fr.Status,
                fr.OpenDate,
                fr.CloseDate,
                a.TailNumber AS AircraftTailNumber,
                a.Model AS AircraftModel,
                tech.FullName AS ReportedByTechnician,
                eng.FullName AS AssignedEngineer,
                DATEDIFF(MINUTE, fr.OpenDate, GETUTCDATE()) AS ElapsedMinutes,
                sla.MaxResolutionTimeMinutes,
                CASE 
                    WHEN DATEDIFF(MINUTE, fr.OpenDate, GETUTCDATE()) > sla.MaxResolutionTimeMinutes 
                    THEN 1 ELSE 0 
                END AS IsSLABreached
            FROM FaultReports fr
            INNER JOIN Aircraft a ON fr.AircraftId = a.Id
            INNER JOIN Users tech ON fr.ReportedByTechnicianId = tech.Id
            LEFT JOIN Users eng ON fr.AssignedEngineerId = eng.Id
            LEFT JOIN SLARules sla ON fr.Priority = sla.Priority
            WHERE fr.Status IN (0, 1)
        ");

        // Stored Procedure 1: sp_GetOverdueSLAFaultReports
        await context.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID('sp_GetOverdueSLAFaultReports', 'P') IS NOT NULL
                DROP PROCEDURE sp_GetOverdueSLAFaultReports;
        ");

        await context.Database.ExecuteSqlRawAsync(@"
            CREATE PROCEDURE sp_GetOverdueSLAFaultReports
            AS
            BEGIN
                SET NOCOUNT ON;
                
                SELECT 
                    fr.Id,
                    fr.Description,
                    fr.Priority,
                    fr.Status,
                    fr.OpenDate,
                    a.TailNumber AS AircraftTailNumber,
                    a.Model AS AircraftModel,
                    tech.FullName AS ReportedBy,
                    eng.FullName AS AssignedTo,
                    sla.MaxResolutionTimeMinutes AS SLALimitMinutes,
                    DATEDIFF(MINUTE, fr.OpenDate, GETUTCDATE()) AS ElapsedMinutes,
                    DATEDIFF(MINUTE, fr.OpenDate, GETUTCDATE()) - sla.MaxResolutionTimeMinutes AS OverdueMinutes
                FROM FaultReports fr
                INNER JOIN Aircraft a ON fr.AircraftId = a.Id
                INNER JOIN Users tech ON fr.ReportedByTechnicianId = tech.Id
                LEFT JOIN Users eng ON fr.AssignedEngineerId = eng.Id
                INNER JOIN SLARules sla ON fr.Priority = sla.Priority
                WHERE fr.Status IN (0, 1)
                    AND DATEDIFF(MINUTE, fr.OpenDate, GETUTCDATE()) > sla.MaxResolutionTimeMinutes
                ORDER BY 
                    fr.Priority DESC,
                    (DATEDIFF(MINUTE, fr.OpenDate, GETUTCDATE()) - sla.MaxResolutionTimeMinutes) DESC;
            END
        ");

        // Stored Procedure 2: sp_GetAircraftMaintenanceSummary
        await context.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID('sp_GetAircraftMaintenanceSummary', 'P') IS NOT NULL
                DROP PROCEDURE sp_GetAircraftMaintenanceSummary;
        ");

        await context.Database.ExecuteSqlRawAsync(@"
            CREATE PROCEDURE sp_GetAircraftMaintenanceSummary
            AS
            BEGIN
                SET NOCOUNT ON;
                
                SELECT 
                    a.Id AS AircraftId,
                    a.TailNumber,
                    a.Model,
                    a.StatusCode,
                    a.TotalFlightHours,
                    COUNT(DISTINCT p.Id) AS TotalParts,
                    SUM(CASE WHEN p.UsedHours >= p.CriticalThresholdHours THEN 1 ELSE 0 END) AS CriticalParts,
                    COUNT(DISTINCT mr.Id) AS TotalMaintenanceRecords,
                    MAX(mr.Date) AS LastMaintenanceDate,
                    MIN(CASE WHEN mr.NextScheduledDate > GETUTCDATE() THEN mr.NextScheduledDate END) AS NextScheduledMaintenance,
                    COUNT(DISTINCT CASE WHEN fr.Status IN (0, 1) THEN fr.Id END) AS OpenFaults
                FROM Aircraft a
                LEFT JOIN Parts p ON a.Id = p.AircraftId
                LEFT JOIN MaintenanceRecords mr ON a.Id = mr.AircraftId
                LEFT JOIN FaultReports fr ON a.Id = fr.AircraftId
                GROUP BY a.Id, a.TailNumber, a.Model, a.StatusCode, a.TotalFlightHours
                ORDER BY CriticalParts DESC, OpenFaults DESC;
            END
        ");
    }
}
