using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public class AircraftService : IAircraftService
{
    private readonly IAeroPulseDbContext _context;

    public AircraftService(IAeroPulseDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PagedResult<AircraftDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? search = null)
    {
        var query = _context.Aircraft.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.ToLower();
            query = query.Where(a => a.TailNumber.ToLower().Contains(search)
                || a.Model.ToLower().Contains(search)
                || a.Operator.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AircraftDto
            {
                Id = a.Id,
                TailNumber = a.TailNumber,
                Model = a.Model,
                ManufactureYear = a.ManufactureYear,
                StatusCode = a.StatusCode,
                TotalFlightHours = a.TotalFlightHours,
                Operator = a.Operator,
                PartsCount = a.Parts.Count,
                ActiveFaultsCount = a.FaultReports.Count(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview),
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<PagedResult<AircraftDto>>.Ok(new PagedResult<AircraftDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<AircraftDto>> GetByIdAsync(Guid id)
    {
        var aircraft = await _context.Aircraft
            .Include(a => a.Parts)
            .Include(a => a.FaultReports)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (aircraft == null)
            return ApiResponse<AircraftDto>.Fail("Aircraft not found.");

        return ApiResponse<AircraftDto>.Ok(new AircraftDto
        {
            Id = aircraft.Id,
            TailNumber = aircraft.TailNumber,
            Model = aircraft.Model,
            ManufactureYear = aircraft.ManufactureYear,
            StatusCode = aircraft.StatusCode,
            TotalFlightHours = aircraft.TotalFlightHours,
            Operator = aircraft.Operator,
            PartsCount = aircraft.Parts.Count,
            ActiveFaultsCount = aircraft.FaultReports.Count(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview),
            CreatedAt = aircraft.CreatedAt
        });
    }

    public async Task<ApiResponse<AircraftDto>> CreateAsync(CreateAircraftDto request)
    {
        if (await _context.Aircraft.AnyAsync(a => a.TailNumber == request.TailNumber))
            return ApiResponse<AircraftDto>.Fail("Aircraft with this tail number already exists.");

        var aircraft = new Aircraft
        {
            TailNumber = request.TailNumber,
            Model = request.Model,
            ManufactureYear = request.ManufactureYear,
            StatusCode = request.StatusCode,
            TotalFlightHours = request.TotalFlightHours,
            Operator = request.Operator
        };

        _context.Aircraft.Add(aircraft);
        await _context.SaveChangesAsync();

        return ApiResponse<AircraftDto>.Ok(new AircraftDto
        {
            Id = aircraft.Id,
            TailNumber = aircraft.TailNumber,
            Model = aircraft.Model,
            ManufactureYear = aircraft.ManufactureYear,
            StatusCode = aircraft.StatusCode,
            TotalFlightHours = aircraft.TotalFlightHours,
            Operator = aircraft.Operator,
            CreatedAt = aircraft.CreatedAt
        }, "Aircraft created successfully.");
    }

    public async Task<ApiResponse<AircraftDto>> UpdateAsync(Guid id, UpdateAircraftDto request)
    {
        var aircraft = await _context.Aircraft.FindAsync(id);
        if (aircraft == null)
            return ApiResponse<AircraftDto>.Fail("Aircraft not found.");

        if (request.TailNumber != null)
        {
            if (await _context.Aircraft.AnyAsync(a => a.TailNumber == request.TailNumber && a.Id != id))
                return ApiResponse<AircraftDto>.Fail("Another aircraft has this tail number.");
            aircraft.TailNumber = request.TailNumber;
        }
        if (request.Model != null) aircraft.Model = request.Model;
        if (request.ManufactureYear.HasValue) aircraft.ManufactureYear = request.ManufactureYear.Value;
        if (request.StatusCode.HasValue) aircraft.StatusCode = request.StatusCode.Value;
        if (request.TotalFlightHours.HasValue) aircraft.TotalFlightHours = request.TotalFlightHours.Value;
        if (request.Operator != null) aircraft.Operator = request.Operator;
        aircraft.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ApiResponse<AircraftDto>.Ok(new AircraftDto
        {
            Id = aircraft.Id,
            TailNumber = aircraft.TailNumber,
            Model = aircraft.Model,
            ManufactureYear = aircraft.ManufactureYear,
            StatusCode = aircraft.StatusCode,
            TotalFlightHours = aircraft.TotalFlightHours,
            Operator = aircraft.Operator,
            CreatedAt = aircraft.CreatedAt
        }, "Aircraft updated successfully.");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var aircraft = await _context.Aircraft.FindAsync(id);
        if (aircraft == null)
            return ApiResponse<bool>.Fail("Aircraft not found.");

        _context.Aircraft.Remove(aircraft);
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Aircraft deleted successfully.");
    }
}
