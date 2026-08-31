using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public class MaintenanceService : IMaintenanceService
{
    private readonly IAeroPulseDbContext _context;

    public MaintenanceService(IAeroPulseDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PagedResult<MaintenanceRecordDto>>> GetAllAsync(int page = 1, int pageSize = 20, Guid? aircraftId = null)
    {
        var query = _context.MaintenanceRecords
            .Include(m => m.Aircraft)
            .Include(m => m.Part)
            .Include(m => m.Engineer)
            .AsQueryable();

        if (aircraftId.HasValue)
            query = query.Where(m => m.AircraftId == aircraftId.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.Date)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return ApiResponse<PagedResult<MaintenanceRecordDto>>.Ok(new PagedResult<MaintenanceRecordDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<MaintenanceRecordDto>> GetByIdAsync(Guid id)
    {
        var record = await _context.MaintenanceRecords
            .Include(m => m.Aircraft)
            .Include(m => m.Part)
            .Include(m => m.Engineer)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (record == null)
            return ApiResponse<MaintenanceRecordDto>.Fail("Maintenance record not found.");

        return ApiResponse<MaintenanceRecordDto>.Ok(MapToDto(record));
    }

    public async Task<ApiResponse<List<MaintenanceRecordDto>>> GetMyTasksAsync(Guid engineerId)
    {
        var tasks = await _context.MaintenanceRecords
            .Include(m => m.Aircraft)
            .Include(m => m.Part)
            .Include(m => m.Engineer)
            .Where(m => m.EngineerId == engineerId)
            .OrderByDescending(m => m.Date)
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

        return ApiResponse<List<MaintenanceRecordDto>>.Ok(tasks);
    }

    public async Task<ApiResponse<MaintenanceRecordDto>> CreateAsync(Guid engineerId, CreateMaintenanceRecordDto request)
    {
        var aircraft = await _context.Aircraft.FindAsync(request.AircraftId);
        if (aircraft == null)
            return ApiResponse<MaintenanceRecordDto>.Fail("Aircraft not found.");

        if (request.PartId.HasValue)
        {
            var part = await _context.Parts.FindAsync(request.PartId.Value);
            if (part == null)
                return ApiResponse<MaintenanceRecordDto>.Fail("Part not found.");
        }

        var record = new MaintenanceRecord
        {
            AircraftId = request.AircraftId,
            PartId = request.PartId,
            WorkPerformed = request.WorkPerformed,
            EngineerId = engineerId,
            Date = request.Date,
            CertificateNo = request.CertificateNo,
            MaintenanceType = request.MaintenanceType,
            NextScheduledDate = request.NextScheduledDate,
            Notes = request.Notes
        };

        _context.MaintenanceRecords.Add(record);
        await _context.SaveChangesAsync();

        // Reload with includes
        var created = await _context.MaintenanceRecords
            .Include(m => m.Aircraft)
            .Include(m => m.Part)
            .Include(m => m.Engineer)
            .FirstAsync(m => m.Id == record.Id);

        return ApiResponse<MaintenanceRecordDto>.Ok(MapToDto(created), "Maintenance record created successfully.");
    }

    public async Task<ApiResponse<MaintenanceRecordDto>> UpdateAsync(Guid id, UpdateMaintenanceRecordDto request)
    {
        var record = await _context.MaintenanceRecords
            .Include(m => m.Aircraft)
            .Include(m => m.Part)
            .Include(m => m.Engineer)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (record == null)
            return ApiResponse<MaintenanceRecordDto>.Fail("Maintenance record not found.");

        if (request.WorkPerformed != null) record.WorkPerformed = request.WorkPerformed;
        if (request.CertificateNo != null) record.CertificateNo = request.CertificateNo;
        if (request.MaintenanceType.HasValue) record.MaintenanceType = request.MaintenanceType.Value;
        if (request.NextScheduledDate.HasValue) record.NextScheduledDate = request.NextScheduledDate.Value;
        if (request.Notes != null) record.Notes = request.Notes;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ApiResponse<MaintenanceRecordDto>.Ok(MapToDto(record), "Maintenance record updated successfully.");
    }

    private static MaintenanceRecordDto MapToDto(MaintenanceRecord m) => new()
    {
        Id = m.Id,
        AircraftId = m.AircraftId,
        AircraftTailNumber = m.Aircraft.TailNumber,
        PartId = m.PartId,
        PartName = m.Part?.PartName,
        WorkPerformed = m.WorkPerformed,
        EngineerId = m.EngineerId,
        EngineerName = m.Engineer.FullName,
        Date = m.Date,
        CertificateNo = m.CertificateNo,
        MaintenanceType = m.MaintenanceType,
        NextScheduledDate = m.NextScheduledDate,
        Notes = m.Notes,
        CreatedAt = m.CreatedAt
    };
}
