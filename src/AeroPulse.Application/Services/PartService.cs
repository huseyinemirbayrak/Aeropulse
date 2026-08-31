using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public class PartService : IPartService
{
    private readonly IAeroPulseDbContext _context;

    public PartService(IAeroPulseDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PagedResult<PartDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? search = null, Guid? aircraftId = null)
    {
        var query = _context.Parts.Include(p => p.Aircraft).AsQueryable();

        if (aircraftId.HasValue)
            query = query.Where(p => p.AircraftId == aircraftId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.ToLower();
            query = query.Where(p => p.PartName.ToLower().Contains(search)
                || p.PartNumber.ToLower().Contains(search)
                || p.Manufacturer.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.UsedHours >= p.CriticalThresholdHours)
            .ThenByDescending(p => p.UsedHours / p.LifeSpanHours)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
                IsCritical = p.UsedHours >= p.CriticalThresholdHours,
                Location = p.Location,
                Manufacturer = p.Manufacturer,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<PagedResult<PartDto>>.Ok(new PagedResult<PartDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<PartDto>> GetByIdAsync(Guid id)
    {
        var part = await _context.Parts.Include(p => p.Aircraft).FirstOrDefaultAsync(p => p.Id == id);
        if (part == null)
            return ApiResponse<PartDto>.Fail("Part not found.");

        return ApiResponse<PartDto>.Ok(MapToDto(part));
    }

    public async Task<ApiResponse<PartDto>> CreateAsync(CreatePartDto request)
    {
        var aircraft = await _context.Aircraft.FindAsync(request.AircraftId);
        if (aircraft == null)
            return ApiResponse<PartDto>.Fail("Aircraft not found.");

        var part = new Part
        {
            PartName = request.PartName,
            PartNumber = request.PartNumber,
            AircraftId = request.AircraftId,
            LifeSpanHours = request.LifeSpanHours,
            UsedHours = request.UsedHours,
            CriticalThresholdHours = request.CriticalThresholdHours,
            Location = request.Location,
            Manufacturer = request.Manufacturer
        };

        _context.Parts.Add(part);
        await _context.SaveChangesAsync();

        // Check critical threshold and create notifications
        if (part.IsCritical)
        {
            await CreateCriticalPartNotificationsAsync(part, aircraft.TailNumber);
        }

        part.Aircraft = aircraft;
        return ApiResponse<PartDto>.Ok(MapToDto(part), "Part created successfully.");
    }

    public async Task<ApiResponse<PartDto>> UpdateAsync(Guid id, UpdatePartDto request)
    {
        var part = await _context.Parts.Include(p => p.Aircraft).FirstOrDefaultAsync(p => p.Id == id);
        if (part == null)
            return ApiResponse<PartDto>.Fail("Part not found.");

        bool wasCriticalBefore = part.IsCritical;

        if (request.PartName != null) part.PartName = request.PartName;
        if (request.PartNumber != null) part.PartNumber = request.PartNumber;
        if (request.LifeSpanHours.HasValue) part.LifeSpanHours = request.LifeSpanHours.Value;
        if (request.UsedHours.HasValue) part.UsedHours = request.UsedHours.Value;
        if (request.CriticalThresholdHours.HasValue) part.CriticalThresholdHours = request.CriticalThresholdHours.Value;
        if (request.Location != null) part.Location = request.Location;
        if (request.Manufacturer != null) part.Manufacturer = request.Manufacturer;
        if (request.IsActive.HasValue) part.IsActive = request.IsActive.Value;
        part.UpdatedAt = DateTime.UtcNow;

        // If part just became critical, trigger notifications
        if (!wasCriticalBefore && part.IsCritical)
        {
            await CreateCriticalPartNotificationsAsync(part, part.Aircraft.TailNumber);
        }

        await _context.SaveChangesAsync();
        return ApiResponse<PartDto>.Ok(MapToDto(part), "Part updated successfully.");
    }

    public async Task<ApiResponse<List<PartDto>>> GetCriticalAlertsAsync()
    {
        var criticalParts = await _context.Parts
            .Include(p => p.Aircraft)
            .Where(p => p.UsedHours >= p.CriticalThresholdHours && p.IsActive)
            .OrderByDescending(p => p.UsedHours / p.LifeSpanHours)
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

        return ApiResponse<List<PartDto>>.Ok(criticalParts);
    }

    private async Task CreateCriticalPartNotificationsAsync(Part part, string tailNumber)
    {
        // Notify all MRO Engineers
        var engineers = await _context.Users
            .Where(u => u.Role == UserRole.MROEngineer && u.IsActive)
            .ToListAsync();

        foreach (var engineer in engineers)
        {
            _context.Notifications.Add(new Notification
            {
                RecipientUserId = engineer.Id,
                Message = $"CRITICAL: Part '{part.PartName}' ({part.PartNumber}) on aircraft {tailNumber} has reached {part.UsedHours:F0}/{part.CriticalThresholdHours:F0} hours threshold.",
                NotificationType = NotificationType.PartCriticalThreshold,
                Date = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
    }

    private static PartDto MapToDto(Part part) => new()
    {
        Id = part.Id,
        PartName = part.PartName,
        PartNumber = part.PartNumber,
        AircraftId = part.AircraftId,
        AircraftTailNumber = part.Aircraft?.TailNumber ?? string.Empty,
        LifeSpanHours = part.LifeSpanHours,
        UsedHours = part.UsedHours,
        CriticalThresholdHours = part.CriticalThresholdHours,
        RemainingLifeHours = part.RemainingLifeHours,
        UsagePercentage = part.UsagePercentage,
        IsCritical = part.IsCritical,
        Location = part.Location,
        Manufacturer = part.Manufacturer,
        IsActive = part.IsActive,
        CreatedAt = part.CreatedAt
    };
}
