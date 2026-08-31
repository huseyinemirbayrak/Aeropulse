using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IAeroPulseDbContext _context;

    public DashboardService(IAeroPulseDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<AdminDashboardDto>> GetAdminDashboardAsync()
    {
        var totalAircraft = await _context.Aircraft.CountAsync();
        var activeAircraft = await _context.Aircraft.CountAsync(a => a.StatusCode == AircraftStatus.Active);
        var inMaintenanceAircraft = await _context.Aircraft.CountAsync(a => a.StatusCode == AircraftStatus.InMaintenance);
        var totalUsers = await _context.Users.CountAsync(u => u.IsActive);
        var openFaults = await _context.FaultReports.CountAsync(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview);
        var criticalFaults = await _context.FaultReports.CountAsync(f => f.Priority == Priority.Critical && (f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview));
        var criticalParts = await _context.Parts.CountAsync(p => p.UsedHours >= p.CriticalThresholdHours && p.IsActive);
        var totalMaintenanceRecords = await _context.MaintenanceRecords.CountAsync();

        // Calculate SLA breaches
        var slaRules = await _context.SLARules.ToListAsync();
        var slaBreaches = 0;
        var activeFaults = await _context.FaultReports
            .Where(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview)
            .ToListAsync();

        foreach (var fault in activeFaults)
        {
            var rule = slaRules.FirstOrDefault(s => s.Priority == fault.Priority);
            if (rule != null)
            {
                var elapsed = (DateTime.UtcNow - fault.OpenDate).TotalMinutes;
                if (elapsed > rule.MaxResolutionTimeMinutes)
                    slaBreaches++;
            }
        }

        var recentFaults = await _context.FaultReports
            .Include(f => f.Aircraft)
            .OrderByDescending(f => f.OpenDate)
            .Take(10)
            .Select(f => new RecentFaultDto
            {
                Id = f.Id,
                AircraftTailNumber = f.Aircraft.TailNumber,
                Description = f.Description,
                Priority = f.Priority,
                Status = f.Status,
                OpenDate = f.OpenDate
            })
            .ToListAsync();

        var aircraftStatusSummary = await _context.Aircraft
            .GroupBy(a => a.StatusCode)
            .Select(g => new AircraftStatusSummaryDto
            {
                Status = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        return ApiResponse<AdminDashboardDto>.Ok(new AdminDashboardDto
        {
            TotalAircraft = totalAircraft,
            ActiveAircraft = activeAircraft,
            InMaintenanceAircraft = inMaintenanceAircraft,
            TotalUsers = totalUsers,
            OpenFaults = openFaults,
            CriticalFaults = criticalFaults,
            SLABreaches = slaBreaches,
            CriticalParts = criticalParts,
            TotalMaintenanceRecords = totalMaintenanceRecords,
            RecentFaults = recentFaults,
            AircraftStatusSummary = aircraftStatusSummary
        });
    }

    public async Task<ApiResponse<MRODashboardDto>> GetMRODashboardAsync(Guid engineerId)
    {
        var myOpenTasks = await _context.MaintenanceRecords
            .CountAsync(m => m.EngineerId == engineerId && m.NextScheduledDate != null && m.NextScheduledDate > DateTime.UtcNow);

        var completedThisMonth = await _context.MaintenanceRecords
            .CountAsync(m => m.EngineerId == engineerId && m.Date.Month == DateTime.UtcNow.Month && m.Date.Year == DateTime.UtcNow.Year);

        var criticalPartsCount = await _context.Parts
            .CountAsync(p => p.UsedHours >= p.CriticalThresholdHours && p.IsActive);

        var pendingMaintenanceCount = await _context.MaintenanceRecords
            .CountAsync(m => m.EngineerId == engineerId && m.NextScheduledDate != null && m.NextScheduledDate <= DateTime.UtcNow.AddDays(7));

        var upcomingMaintenance = await _context.MaintenanceRecords
            .Include(m => m.Aircraft)
            .Include(m => m.Part)
            .Include(m => m.Engineer)
            .Where(m => m.EngineerId == engineerId && m.NextScheduledDate != null)
            .OrderBy(m => m.NextScheduledDate)
            .Take(10)
            .Select(m => new MaintenanceRecordDto
            {
                Id = m.Id,
                AircraftId = m.AircraftId,
                AircraftTailNumber = m.Aircraft.TailNumber,
                PartId = m.PartId,
                PartName = m.Part != null ? m.Part.PartName : null,
                WorkPerformed = m.WorkPerformed,
                EngineerId = m.EngineerId,
                EngineerName = m.Engineer.FullName,
                Date = m.Date,
                CertificateNo = m.CertificateNo,
                MaintenanceType = m.MaintenanceType,
                NextScheduledDate = m.NextScheduledDate,
                Notes = m.Notes,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();

        var criticalParts = await _context.Parts
            .Include(p => p.Aircraft)
            .Where(p => p.UsedHours >= p.CriticalThresholdHours && p.IsActive)
            .OrderByDescending(p => p.UsedHours / p.LifeSpanHours)
            .Take(10)
            .Select(p => new PartDto
            {
                Id = p.Id,
                PartName = p.PartName,
                PartNumber = p.PartNumber,
                AircraftId = p.AircraftId,
                AircraftTailNumber = p.Aircraft.TailNumber,
                LifeSpanHours = p.LifeSpanHours,
                UsedHours = p.UsedHours,
                CriticalThresholdHours = p.CriticalThresholdHours,
                RemainingLifeHours = Math.Max(0, p.LifeSpanHours - p.UsedHours),
                UsagePercentage = p.LifeSpanHours > 0 ? (p.UsedHours / p.LifeSpanHours) * 100 : 0,
                IsCritical = true,
                Location = p.Location,
                Manufacturer = p.Manufacturer,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<MRODashboardDto>.Ok(new MRODashboardDto
        {
            MyOpenTasks = myOpenTasks,
            CompletedThisMonth = completedThisMonth,
            CriticalPartsCount = criticalPartsCount,
            PendingMaintenanceCount = pendingMaintenanceCount,
            UpcomingMaintenance = upcomingMaintenance,
            CriticalParts = criticalParts
        });
    }
}
