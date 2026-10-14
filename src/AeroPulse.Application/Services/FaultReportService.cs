using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public class FaultReportService : IFaultReportService
{
    private readonly IAeroPulseDbContext _context;
    private readonly IMessageBusService _messageBus;
    private readonly INotificationService _notificationService;

    public FaultReportService(
        IAeroPulseDbContext context,
        IMessageBusService messageBus,
        INotificationService notificationService)
    {
        _context = context;
        _messageBus = messageBus;
        _notificationService = notificationService;
    }

    public async Task<ApiResponse<PagedResult<FaultReportDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? status = null, Guid? aircraftId = null)
    {
        var query = _context.FaultReports
            .Include(f => f.Aircraft)
            .Include(f => f.ReportedByTechnician)
            .Include(f => f.AssignedEngineer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<FaultStatus>(status, true, out var statusEnum))
            query = query.Where(f => f.Status == statusEnum);

        if (aircraftId.HasValue)
            query = query.Where(f => f.AircraftId == aircraftId.Value);

        var totalCount = await query.CountAsync();
        var slaRules = await _context.SLARules.ToListAsync();

        var items = await query
            .OrderByDescending(f => f.OpenDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(f => MapToDto(f, slaRules)).ToList();

        return ApiResponse<PagedResult<FaultReportDto>>.Ok(new PagedResult<FaultReportDto>
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<FaultReportDto>> GetByIdAsync(Guid id)
    {
        var fault = await _context.FaultReports
            .Include(f => f.Aircraft)
            .Include(f => f.ReportedByTechnician)
            .Include(f => f.AssignedEngineer)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fault == null)
            return ApiResponse<FaultReportDto>.Fail("Fault report not found.");

        var slaRules = await _context.SLARules.ToListAsync();
        return ApiResponse<FaultReportDto>.Ok(MapToDto(fault, slaRules));
    }

    public async Task<ApiResponse<FaultReportDto>> CreateAsync(CreateFaultReportDto request, Guid reportedByUserId)
    {
        var aircraft = await _context.Aircraft.FindAsync(request.AircraftId);
        if (aircraft == null)
            return ApiResponse<FaultReportDto>.Fail("Aircraft not found.");

        var technician = await _context.Users.FindAsync(reportedByUserId);
        if (technician == null)
            return ApiResponse<FaultReportDto>.Fail("Reporting technician not found.");

        var fault = new FaultReport
        {
            AircraftId = request.AircraftId,
            ReportedByTechnicianId = reportedByUserId,
            AssignedEngineerId = request.AssignedEngineerId,
            Priority = request.Priority,
            Description = request.Description,
            Status = FaultStatus.Open,
            OpenDate = DateTime.UtcNow
        };

        _context.FaultReports.Add(fault);
        await _context.SaveChangesAsync();

        if (request.AssignedEngineerId.HasValue)
        {
            await _messageBus.PublishAsync("fault.assigned", new FaultAssignedMessage
            {
                FaultReportId = fault.Id,
                AircraftTailNumber = aircraft.TailNumber,
                Description = fault.Description,
                Priority = fault.Priority.ToString(),
                AssignedEngineerId = request.AssignedEngineerId.Value
            });

            await _notificationService.CreateAsync(
                request.AssignedEngineerId.Value,
                $"New {fault.Priority} priority fault assigned: {aircraft.TailNumber} - {fault.Description[..Math.Min(50, fault.Description.Length)]}...",
                NotificationType.FaultAssigned,
                fault.Id
            );
        }

        var created = await _context.FaultReports
            .Include(f => f.Aircraft)
            .Include(f => f.ReportedByTechnician)
            .Include(f => f.AssignedEngineer)
            .FirstAsync(f => f.Id == fault.Id);

        var slaRules = await _context.SLARules.ToListAsync();
        return ApiResponse<FaultReportDto>.Ok(MapToDto(created, slaRules), "Fault report created and assigned engineer notified.");
    }

    public async Task<ApiResponse<FaultReportDto>> UpdateAsync(Guid id, UpdateFaultReportDto request)
    {
        var fault = await _context.FaultReports
            .Include(f => f.Aircraft)
            .Include(f => f.ReportedByTechnician)
            .Include(f => f.AssignedEngineer)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fault == null)
            return ApiResponse<FaultReportDto>.Fail("Fault report not found.");

        if (request.Status.HasValue)
        {
            fault.Status = request.Status.Value;
            if (request.Status.Value == FaultStatus.Resolved || request.Status.Value == FaultStatus.Closed)
                fault.CloseDate = DateTime.UtcNow;
        }

        if (request.Priority.HasValue) fault.Priority = request.Priority.Value;
        if (request.ResolutionNotes != null) fault.ResolutionNotes = request.ResolutionNotes;
        if (request.AssignedEngineerId.HasValue) fault.AssignedEngineerId = request.AssignedEngineerId.Value;
        fault.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var slaRules = await _context.SLARules.ToListAsync();
        return ApiResponse<FaultReportDto>.Ok(MapToDto(fault, slaRules), "Fault report updated.");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var fault = await _context.FaultReports.FindAsync(id);
        if (fault == null)
            return ApiResponse<bool>.Fail("Fault report not found.");

        _context.FaultReports.Remove(fault);
        await _context.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Fault report deleted.");
    }

    public async Task<ApiResponse<List<FaultReportDto>>> GetMyFaultsAsync(Guid technicianId)
    {
        var slaRules = await _context.SLARules.ToListAsync();
        var faults = await _context.FaultReports
            .Include(f => f.Aircraft)
            .Include(f => f.ReportedByTechnician)
            .Include(f => f.AssignedEngineer)
            .Where(f => f.ReportedByTechnicianId == technicianId)
            .OrderByDescending(f => f.OpenDate)
            .ToListAsync();

        return ApiResponse<List<FaultReportDto>>.Ok(faults.Select(f => MapToDto(f, slaRules)).ToList());
    }

    public async Task<ApiResponse<List<FaultReportDto>>> GetOverdueSLAAsync()
    {
        var slaRules = await _context.SLARules.ToListAsync();
        var activeFaults = await _context.FaultReports
            .Include(f => f.Aircraft)
            .Include(f => f.ReportedByTechnician)
            .Include(f => f.AssignedEngineer)
            .Where(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview)
            .ToListAsync();

        var overdue = activeFaults
            .Select(f => MapToDto(f, slaRules))
            .Where(f => f.IsSLABreached)
            .OrderByDescending(f => f.ElapsedMinutes)
            .ToList();

        return ApiResponse<List<FaultReportDto>>.Ok(overdue);
    }

    private static FaultReportDto MapToDto(FaultReport f, List<SLARule> slaRules)
    {
        var elapsed = f.CloseDate.HasValue
            ? (int)(f.CloseDate.Value - f.OpenDate).TotalMinutes
            : (int)(DateTime.UtcNow - f.OpenDate).TotalMinutes;

        var slaRule = slaRules.FirstOrDefault(r => r.Priority == f.Priority);
        var isSlaBreached = slaRule != null && f.Status is FaultStatus.Open or FaultStatus.UnderReview
            && elapsed > slaRule.MaxResolutionTimeMinutes;

        return new FaultReportDto
        {
            Id = f.Id,
            AircraftId = f.AircraftId,
            AircraftTailNumber = f.Aircraft?.TailNumber ?? "—",
            ReportedByTechnicianId = f.ReportedByTechnicianId,
            ReportedByTechnicianName = f.ReportedByTechnician?.FullName ?? "—",
            AssignedEngineerId = f.AssignedEngineerId,
            AssignedEngineerName = f.AssignedEngineer?.FullName,
            Priority = f.Priority,
            Status = f.Status,
            OpenDate = f.OpenDate,
            CloseDate = f.CloseDate,
            Description = f.Description,
            ResolutionNotes = f.ResolutionNotes,
            ElapsedMinutes = elapsed,
            IsSLABreached = isSlaBreached,
            CreatedAt = f.CreatedAt
        };
    }
}
