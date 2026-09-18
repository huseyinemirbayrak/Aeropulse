using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

/// <summary>
/// Ground services operation management service.
/// 
/// Most critical feature: CloseWithSLAAsync method.
/// This method uses a "transaction" — meaning it performs two operations together:
///   1. Closes the operation as "Completed"
///   2. Creates an SLA (Service Level Agreement) record
/// If either of these operations fails, BOTH are ROLLED BACK.
/// This is the same as the "all or nothing" logic in bank transfers.
/// </summary>
public class OperationService : IOperationService
{
    private readonly IAeroPulseDbContext _context;

    // "Standard turnaround time" — varies by aircraft type in real aviation
    // Reference value for SLA breach control (minutes)
    private const int STANDARD_TURNAROUND_SLA_MINUTES = 90;

    public OperationService(IAeroPulseDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PagedResult<OperationDto>>> GetAllAsync(int page = 1, int pageSize = 20, string? flightNumber = null, string? status = null)
    {
        var query = _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(flightNumber))
            query = query.Where(o => o.FlightNumber.ToLower().Contains(flightNumber.ToLower()));

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OperationStatus>(status, true, out var statusEnum))
            query = query.Where(o => o.Status == statusEnum);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.ArrivalTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => MapToDto(o))
            .ToListAsync();

        return ApiResponse<PagedResult<OperationDto>>.Ok(new PagedResult<OperationDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<OperationDto>> GetByIdAsync(Guid id)
    {
        var operation = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (operation == null)
            return ApiResponse<OperationDto>.Fail("Operation not found.");

        return ApiResponse<OperationDto>.Ok(MapToDto(operation));
    }

    public async Task<ApiResponse<OperationDto>> CreateAsync(CreateOperationDto request)
    {
        // Check if there is already an active operation for the same flight
        if (await _context.Operations.AnyAsync(o =>
            o.FlightNumber == request.FlightNumber &&
            o.Status != OperationStatus.Completed &&
            o.Status != OperationStatus.Cancelled))
        {
            return ApiResponse<OperationDto>.Fail($"There is already an active operation for flight '{request.FlightNumber}'.");
        }

        var aircraft = await _context.Aircraft.FindAsync(request.AircraftId);
        if (aircraft == null)
            return ApiResponse<OperationDto>.Fail("Aircraft not found.");

        var operation = new Operation
        {
            AircraftId = request.AircraftId,
            GateNo = request.GateNo,
            FlightNumber = request.FlightNumber,
            ArrivalTime = request.ArrivalTime,
            DepartureTime = request.DepartureTime,
            OperationsManagerId = request.OperationsManagerId,
            Status = OperationStatus.Scheduled
        };

        _context.Operations.Add(operation);
        await _context.SaveChangesAsync();

        // Reload
        var created = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstAsync(o => o.Id == operation.Id);

        return ApiResponse<OperationDto>.Ok(MapToDto(created), "Operation successfully created.");
    }

    public async Task<ApiResponse<OperationDto>> UpdateAsync(Guid id, UpdateOperationDto request)
    {
        var operation = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (operation == null)
            return ApiResponse<OperationDto>.Fail("Operation not found.");

        if (request.GateNo != null) operation.GateNo = request.GateNo;
        if (request.FlightNumber != null) operation.FlightNumber = request.FlightNumber;
        if (request.ArrivalTime.HasValue) operation.ArrivalTime = request.ArrivalTime.Value;
        if (request.DepartureTime.HasValue) operation.DepartureTime = request.DepartureTime.Value;
        if (request.Status.HasValue) operation.Status = request.Status.Value;
        if (request.DelayMinutes.HasValue) operation.DelayMinutes = request.DelayMinutes.Value;
        if (request.DelayReason != null) operation.DelayReason = request.DelayReason;
        if (request.OperationsManagerId.HasValue) operation.OperationsManagerId = request.OperationsManagerId;
        operation.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ApiResponse<OperationDto>.Ok(MapToDto(operation), "Operation updated.");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var operation = await _context.Operations.FindAsync(id);
        if (operation == null)
            return ApiResponse<bool>.Fail("Operation not found.");

        if (operation.Status == OperationStatus.InProgress)
            return ApiResponse<bool>.Fail("An ongoing operation cannot be deleted. Cancel it first.");

        _context.Operations.Remove(operation);
        await _context.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Operation deleted.");
    }

    /// <summary>
    /// *** TRANSACTION METHOD ***
    /// 
    /// This method performs two operations atomically:
    ///   1. Updates Operation.Status → Completed
    ///   2. Creates SLA record (Notification + meta)
    /// 
    /// Analogy: Like signing a contract — you both hand over the signed copy
    /// and write it in the ledger. If both don't happen, neither is valid.
    /// </summary>
    public async Task<ApiResponse<SLARecordDto>> CloseWithSLAAsync(Guid id, CloseOperationDto request)
    {
        // EF Core DbContext already provides a Unit of Work,
        // we use Database.BeginTransactionAsync() for transaction
        var dbContext = (_context as Microsoft.EntityFrameworkCore.DbContext)!;

        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        try
        {
            // ===== STEP 1: Close the operation =====
            var operation = await _context.Operations
                .Include(o => o.Aircraft)
                .Include(o => o.OperationsManager)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (operation == null)
            {
                await transaction.RollbackAsync();
                return ApiResponse<SLARecordDto>.Fail("Operation not found.");
            }

            if (operation.Status == OperationStatus.Completed)
            {
                await transaction.RollbackAsync();
                return ApiResponse<SLARecordDto>.Fail("This operation has already been closed.");
            }

            // Update delay information
            operation.Status = OperationStatus.Completed;
            operation.DelayMinutes = request.DelayMinutes;
            if (request.DelayReason != null) operation.DelayReason = request.DelayReason;
            operation.UpdatedAt = DateTime.UtcNow;

            // ===== STEP 2: Create SLA record =====
            var turnaroundMinutes = (int)(DateTime.UtcNow - operation.ArrivalTime).TotalMinutes;
            var metSLA = turnaroundMinutes <= STANDARD_TURNAROUND_SLA_MINUTES;

            // Save SLA result as Notification
            var slaNotification = new Notification
            {
                RecipientUserId = operation.OperationsManagerId ?? Guid.Empty,
                Message = metSLA
                    ? $"✅ SLA SUCCESS: Flight {operation.FlightNumber} completed in {turnaroundMinutes} minutes. (SLA limit: {STANDARD_TURNAROUND_SLA_MINUTES} min)"
                    : $"⚠️ SLA BREACH: Flight {operation.FlightNumber} took {turnaroundMinutes} minutes! (SLA limit: {STANDARD_TURNAROUND_SLA_MINUTES} min, exceeded by {turnaroundMinutes - STANDARD_TURNAROUND_SLA_MINUTES} min)",
                NotificationType = metSLA ? NotificationType.OperationCompleted : NotificationType.SLABreached,
                Date = DateTime.UtcNow,
                IsRead = false
            };

            // if operationsManagerId is null, send to admin
            if (operation.OperationsManagerId == null)
            {
                // Send to Admin user
                var admin = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin);
                if (admin != null) slaNotification.RecipientUserId = admin.Id;
            }

            _context.Notifications.Add(slaNotification);

            // ===== SAVE BOTH STEPS (all or nothing) =====
            await _context.SaveChangesAsync();

            // ===== SUCCESS: COMMIT =====
            await transaction.CommitAsync();

            var slaRecord = new SLARecordDto
            {
                OperationId = operation.Id,
                FlightNumber = operation.FlightNumber,
                TurnaroundMinutes = turnaroundMinutes,
                DelayMinutes = request.DelayMinutes,
                MetSLA = metSLA,
                Notes = request.CompletionNotes ?? string.Empty,
                RecordedAt = DateTime.UtcNow
            };

            return ApiResponse<SLARecordDto>.Ok(slaRecord,
                metSLA ? "Operation closed successfully. SLA target met! ✅"
                       : "Operation closed but SLA breach detected. ⚠️");
        }
        catch (Exception ex)
        {
            // ===== ERROR: ROLLBACK — both operations are rolled back =====
            await transaction.RollbackAsync();
            return ApiResponse<SLARecordDto>.Fail($"Transaction failed, all changes rolled back: {ex.Message}");
        }
    }

    public async Task<ApiResponse<OperationChecklistDto>> GetChecklistAsync(Guid id)
    {
        var operation = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (operation == null)
            return ApiResponse<OperationChecklistDto>.Fail("Operation not found.");

        // Standard turnaround checklist steps
        // In a real airport, these steps are tracked in a digital system
        var checklistItems = new List<OperationChecklistItemDto>
        {
            new() { Step = "🛬 Aircraft arrived at gate", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "🔗 Jet bridge connected", IsCompleted = operation.JetBridgeAssignments.Any(j => j.Status >= JetBridgeAssignmentStatus.BridgeConnected) },
            new() { Step = "🚌 Stairs/vehicle positioned", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "👥 Passenger disembarking started", IsCompleted = operation.JetBridgeAssignments.Any(j => j.Status >= JetBridgeAssignmentStatus.BridgeConnected) },
            new() { Step = "🧳 Baggage unloading started", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "⛽ Refueling", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "🍽️ Catering delivery", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "🧹 Cabin cleaning completed", IsCompleted = operation.Status >= OperationStatus.Completed },
            new() { Step = "✈️ New passenger boarding completed", IsCompleted = operation.Status == OperationStatus.Completed },
            new() { Step = "📋 Departure document signed", IsCompleted = operation.Status == OperationStatus.Completed },
        };

        var checklist = new OperationChecklistDto
        {
            OperationId = operation.Id,
            FlightNumber = operation.FlightNumber,
            AircraftTailNumber = operation.Aircraft?.TailNumber ?? "—",
            GateNo = operation.GateNo,
            Status = operation.Status,
            Items = checklistItems
        };

        return ApiResponse<OperationChecklistDto>.Ok(checklist);
    }

    public async Task<ApiResponse<List<OperationDto>>> GetDelayedOperationsAsync()
    {
        var delayed = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .Where(o => o.Status == OperationStatus.Delayed || o.DelayMinutes > 0)
            .OrderByDescending(o => o.DelayMinutes)
            .Select(o => MapToDto(o))
            .ToListAsync();

        return ApiResponse<List<OperationDto>>.Ok(delayed);
    }

    private static OperationDto MapToDto(Operation o) => new()
    {
        Id = o.Id,
        AircraftId = o.AircraftId,
        AircraftTailNumber = o.Aircraft?.TailNumber ?? "—",
        GateNo = o.GateNo,
        FlightNumber = o.FlightNumber,
        ArrivalTime = o.ArrivalTime,
        DepartureTime = o.DepartureTime,
        Status = o.Status,
        DelayMinutes = o.DelayMinutes,
        DelayReason = o.DelayReason,
        OperationsManagerId = o.OperationsManagerId,
        OperationsManagerName = o.OperationsManager?.FullName,
        CreatedAt = o.CreatedAt
    };
}
