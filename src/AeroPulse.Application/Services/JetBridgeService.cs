using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

public class JetBridgeService : IJetBridgeService
{
    private readonly IAeroPulseDbContext _context;
    private readonly IMessageBusService _messageBus;
    private readonly ICacheService _cache;
    private readonly INotificationService _notificationService;

    private const string AVAILABLE_BRIDGES_CACHE_KEY = "jetbridges:available:{0}";
    private static readonly TimeSpan CACHE_TTL = TimeSpan.FromMinutes(2);

    public JetBridgeService(
        IAeroPulseDbContext context,
        IMessageBusService messageBus,
        ICacheService cache,
        INotificationService notificationService)
    {
        _context = context;
        _messageBus = messageBus;
        _cache = cache;
        _notificationService = notificationService;
    }

    public async Task<ApiResponse<List<JetBridgeDto>>> GetAllAsync(string? terminalNo = null)
    {
        var query = _context.JetBridges
            .Include(j => j.Assignments.Where(a => a.Status != JetBridgeAssignmentStatus.Released))
                .ThenInclude(a => a.Aircraft)
            .Include(j => j.Assignments.Where(a => a.Status != JetBridgeAssignmentStatus.Released))
                .ThenInclude(a => a.Operation)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(terminalNo))
            query = query.Where(j => j.TerminalNo == terminalNo);

        var bridges = await query.OrderBy(j => j.TerminalNo).ThenBy(j => j.BridgeNo).ToListAsync();
        return ApiResponse<List<JetBridgeDto>>.Ok(bridges.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<JetBridgeDto>> GetByIdAsync(Guid id)
    {
        var bridge = await _context.JetBridges
            .Include(j => j.Assignments.Where(a => a.Status != JetBridgeAssignmentStatus.Released))
                .ThenInclude(a => a.Aircraft)
            .Include(j => j.Assignments.Where(a => a.Status != JetBridgeAssignmentStatus.Released))
                .ThenInclude(a => a.Operation)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (bridge == null) return ApiResponse<JetBridgeDto>.Fail("Jet bridge not found.");
        return ApiResponse<JetBridgeDto>.Ok(MapToDto(bridge));
    }

    public async Task<ApiResponse<JetBridgeDto>> CreateAsync(CreateJetBridgeDto request)
    {
        if (await _context.JetBridges.AnyAsync(j => j.TerminalNo == request.TerminalNo && j.BridgeNo == request.BridgeNo))
            return ApiResponse<JetBridgeDto>.Fail($"Jet bridge {request.BridgeNo} already exists in terminal {request.TerminalNo}.");

        var bridge = new JetBridge
        {
            BridgeNo = request.BridgeNo,
            TerminalNo = request.TerminalNo,
            StatusCode = request.StatusCode
        };

        _context.JetBridges.Add(bridge);
        await _context.SaveChangesAsync();

        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, request.TerminalNo));

        return ApiResponse<JetBridgeDto>.Ok(MapToDto(bridge), "Jet bridge added.");
    }

    public async Task<ApiResponse<JetBridgeDto>> UpdateAsync(Guid id, UpdateJetBridgeDto request)
    {
        var bridge = await _context.JetBridges.FindAsync(id);
        if (bridge == null) return ApiResponse<JetBridgeDto>.Fail("Jet bridge not found.");

        var oldTerminal = bridge.TerminalNo;
        if (request.BridgeNo != null) bridge.BridgeNo = request.BridgeNo;
        if (request.TerminalNo != null) bridge.TerminalNo = request.TerminalNo;
        if (request.StatusCode.HasValue) bridge.StatusCode = request.StatusCode.Value;
        bridge.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, oldTerminal));
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));

        return ApiResponse<JetBridgeDto>.Ok(MapToDto(bridge), "Jet bridge updated.");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var bridge = await _context.JetBridges.FindAsync(id);
        if (bridge == null) return ApiResponse<bool>.Fail("Jet bridge not found.");

        if (bridge.StatusCode == JetBridgeStatus.Connected)
            return ApiResponse<bool>.Fail("Cannot delete a connected jet bridge.");

        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));
        _context.JetBridges.Remove(bridge);
        await _context.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Jet bridge deleted.");
    }

    public async Task<ApiResponse<List<JetBridgeAssignmentDto>>> GetAllAssignmentsAsync(Guid? jetBridgeId = null)
    {
        var query = _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .AsQueryable();

        if (jetBridgeId.HasValue)
            query = query.Where(a => a.JetBridgeId == jetBridgeId.Value);

        var assignments = await query.OrderByDescending(a => a.EstimatedArrivalTime).ToListAsync();
        return ApiResponse<List<JetBridgeAssignmentDto>>.Ok(assignments.Select(MapAssignmentToDto).ToList());
    }

    public async Task<ApiResponse<JetBridgeAssignmentDto>> GetAssignmentByIdAsync(Guid id)
    {
        var assignment = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (assignment == null) return ApiResponse<JetBridgeAssignmentDto>.Fail("Assignment not found.");
        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(assignment));
    }

    public async Task<ApiResponse<JetBridgeAssignmentDto>> CreateAssignmentAsync(CreateJetBridgeAssignmentDto request)
    {
        var bridge = await _context.JetBridges.FindAsync(request.JetBridgeId);
        if (bridge == null) return ApiResponse<JetBridgeAssignmentDto>.Fail("Jet bridge not found.");

        if (bridge.StatusCode == JetBridgeStatus.UnderMaintenance)
            return ApiResponse<JetBridgeAssignmentDto>.Fail($"Jet bridge {bridge.BridgeNo} is under maintenance, assignment cannot be made.");

        var conflictCheck = await CheckAvailabilityAsync(
            request.JetBridgeId,
            request.EstimatedArrivalTime,
            request.EstimatedDepartureTime
        );

        if (conflictCheck.HasConflict)
        {
            return ApiResponse<JetBridgeAssignmentDto>.Fail(conflictCheck.Message);
        }

        var assignment = new JetBridgeAssignment
        {
            JetBridgeId = request.JetBridgeId,
            AircraftId = request.AircraftId,
            OperationId = request.OperationId,
            EstimatedArrivalTime = request.EstimatedArrivalTime,
            DisconnectionTime = request.EstimatedDepartureTime,
            PassengerCount = request.PassengerCount,
            Status = JetBridgeAssignmentStatus.Planned
        };

        bridge.StatusCode = JetBridgeStatus.Reserved;
        bridge.UpdatedAt = DateTime.UtcNow;

        _context.JetBridgeAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));

        var created = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .FirstAsync(a => a.Id == assignment.Id);

        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(created), "Jet bridge assignment created.");
    }

    public async Task<ApiResponse<JetBridgeAssignmentDto>> UpdateAssignmentStatusAsync(Guid assignmentId, UpdateAssignmentStatusDto request)
    {
        var assignment = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
                .ThenInclude(o => o!.OperationsManager)
            .FirstOrDefaultAsync(a => a.Id == assignmentId);

        if (assignment == null)
            return ApiResponse<JetBridgeAssignmentDto>.Fail("Assignment not found.");

        var previousStatus = assignment.Status;
        assignment.Status = request.NewStatus;
        assignment.UpdatedAt = DateTime.UtcNow;

        switch (request.NewStatus)
        {
            case JetBridgeAssignmentStatus.AircraftLanded:
                assignment.ActualArrivalTime = DateTime.UtcNow;
                assignment.JetBridge.StatusCode = JetBridgeStatus.Reserved;
                break;

            case JetBridgeAssignmentStatus.BridgeConnected:
                assignment.ConnectionTime = DateTime.UtcNow;
                assignment.JetBridge.StatusCode = JetBridgeStatus.Connected;
                break;

            case JetBridgeAssignmentStatus.Released:
                assignment.DisconnectionTime = DateTime.UtcNow;
                assignment.JetBridge.StatusCode = JetBridgeStatus.Available;
                break;
        }

        assignment.JetBridge.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, assignment.JetBridge.TerminalNo));
        await PublishStatusChangeAsync(assignment, previousStatus, request.NewStatus);

        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(assignment),
            $"Jet bridge status updated to '{request.NewStatus}'.");
    }

    public async Task<JetBridgeConflictResultDto> CheckAvailabilityAsync(Guid jetBridgeId, DateTime start, DateTime end, Guid? excludeAssignmentId = null)
    {
        var conflictingAssignment = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .Where(a =>
                a.JetBridgeId == jetBridgeId &&
                a.Status != JetBridgeAssignmentStatus.Released && 
                (excludeAssignmentId == null || a.Id != excludeAssignmentId) &&
                start < (a.DisconnectionTime ?? a.EstimatedArrivalTime.AddHours(3)) && 
                end > a.EstimatedArrivalTime                                           
            )
            .FirstOrDefaultAsync();

        if (conflictingAssignment == null)
        {
            return new JetBridgeConflictResultDto { HasConflict = false, Message = "Jet bridge is available." };
        }

        var bridge = await _context.JetBridges.FindAsync(jetBridgeId);
        var alternatives = await GetAvailableBridgesForPeriodAsync(bridge!.TerminalNo, start, end, jetBridgeId);

        return new JetBridgeConflictResultDto
        {
            HasConflict = true,
            Message = $"Bridge {bridge.BridgeNo} is occupied between {conflictingAssignment.EstimatedArrivalTime:HH:mm}-{(conflictingAssignment.DisconnectionTime ?? conflictingAssignment.EstimatedArrivalTime.AddHours(3)):HH:mm}. " +
                      (alternatives.Any()
                          ? $"Alternative available bridges: {string.Join(", ", alternatives.Select(a => a.BridgeNo))}"
                          : "No alternative bridges available in this terminal for the specified interval."),
            ConflictingAssignment = MapAssignmentToDto(conflictingAssignment),
            AlternativeBridges = alternatives.Select(MapToDto).ToList()
        };
    }

    public async Task<ApiResponse<List<JetBridgeDto>>> GetAvailableBridgesAsync(string terminalNo)
    {
        var cacheKey = string.Format(AVAILABLE_BRIDGES_CACHE_KEY, terminalNo);

        var cached = await _cache.GetAsync<List<JetBridgeDto>>(cacheKey);
        if (cached != null)
            return ApiResponse<List<JetBridgeDto>>.Ok(cached, "Retrieved from cache.");

        var bridges = await _context.JetBridges
            .Where(j => j.TerminalNo == terminalNo && j.StatusCode == JetBridgeStatus.Available)
            .OrderBy(j => j.BridgeNo)
            .ToListAsync();

        var dtos = bridges.Select(MapToDto).ToList();
        await _cache.SetAsync(cacheKey, dtos, CACHE_TTL);

        return ApiResponse<List<JetBridgeDto>>.Ok(dtos, "Retrieved from database and cached.");
    }

    private async Task<List<JetBridge>> GetAvailableBridgesForPeriodAsync(string terminalNo, DateTime start, DateTime end, Guid excludeBridgeId)
    {
        var allBridges = await _context.JetBridges
            .Where(j => j.TerminalNo == terminalNo && j.Id != excludeBridgeId && j.StatusCode != JetBridgeStatus.UnderMaintenance)
            .ToListAsync();

        var availableBridges = new List<JetBridge>();
        foreach (var bridge in allBridges)
        {
            var hasConflict = await _context.JetBridgeAssignments.AnyAsync(a =>
                a.JetBridgeId == bridge.Id &&
                a.Status != JetBridgeAssignmentStatus.Released &&
                start < (a.DisconnectionTime ?? a.EstimatedArrivalTime.AddHours(3)) &&
                end > a.EstimatedArrivalTime);

            if (!hasConflict)
                availableBridges.Add(bridge);
        }

        return availableBridges;
    }

    private async Task PublishStatusChangeAsync(JetBridgeAssignment assignment, JetBridgeAssignmentStatus previous, JetBridgeAssignmentStatus newStatus)
    {
        string eventType = newStatus switch
        {
            JetBridgeAssignmentStatus.BridgeConnected => "BridgeConnected",
            JetBridgeAssignmentStatus.AircraftLanded => "AircraftLanded",
            JetBridgeAssignmentStatus.DisembarkingComplete => "DisembarkingComplete",
            JetBridgeAssignmentStatus.Released => "BridgeReleased",
            _ => "StatusChanged"
        };

        var message = newStatus switch
        {
            JetBridgeAssignmentStatus.BridgeConnected =>
                $"Flight {assignment.Operation?.FlightNumber} connected to bridge {assignment.JetBridge.TerminalNo}/{assignment.JetBridge.BridgeNo} at {DateTime.UtcNow:HH:mm}. Deboarding authorized.",
            JetBridgeAssignmentStatus.AircraftLanded =>
                $"Aircraft {assignment.Aircraft?.TailNumber} ({assignment.Operation?.FlightNumber}) on-blocks. Boarding bridge positioning active.",
            JetBridgeAssignmentStatus.DisembarkingComplete =>
                $"Passenger disembarking completed for flight {assignment.Operation?.FlightNumber}. Bridge release authorized.",
            JetBridgeAssignmentStatus.Released =>
                $"Bridge {assignment.JetBridge.BridgeNo} released and cleared for subsequent assignments.",
            _ => $"Jet bridge status transition: {newStatus}"
        };

        await _messageBus.PublishAsync($"jetbridge.{eventType.ToLower()}", new BridgeStatusMessage
        {
            EventType = eventType,
            FlightNumber = assignment.Operation?.FlightNumber ?? "—",
            BridgeNo = assignment.JetBridge.BridgeNo,
            TerminalNo = assignment.JetBridge.TerminalNo,
            Message = message
        });

        if (newStatus == JetBridgeAssignmentStatus.BridgeConnected)
        {
            if (assignment.Operation?.OperationsManagerId.HasValue == true)
            {
                await _notificationService.CreateAsync(
                    assignment.Operation.OperationsManagerId!.Value,
                    message,
                    NotificationType.JetBridgeConnected
                );
            }
        }
    }

    private static JetBridgeDto MapToDto(JetBridge j)
    {
        var activeAssignment = j.Assignments?.FirstOrDefault(a => a.Status != JetBridgeAssignmentStatus.Released);
        return new JetBridgeDto
        {
            Id = j.Id,
            BridgeNo = j.BridgeNo,
            TerminalNo = j.TerminalNo,
            StatusCode = j.StatusCode,
            CurrentAssignment = activeAssignment != null ? MapAssignmentToDto(activeAssignment) : null,
            CreatedAt = j.CreatedAt
        };
    }

    private static JetBridgeAssignmentDto MapAssignmentToDto(JetBridgeAssignment a) => new()
    {
        Id = a.Id,
        JetBridgeId = a.JetBridgeId,
        BridgeNo = a.JetBridge?.BridgeNo ?? "—",
        TerminalNo = a.JetBridge?.TerminalNo ?? "—",
        AircraftId = a.AircraftId,
        AircraftTailNumber = a.Aircraft?.TailNumber ?? "—",
        OperationId = a.OperationId,
        FlightNumber = a.Operation?.FlightNumber ?? "—",
        EstimatedArrivalTime = a.EstimatedArrivalTime,
        ActualArrivalTime = a.ActualArrivalTime,
        ConnectionTime = a.ConnectionTime,
        DisconnectionTime = a.DisconnectionTime,
        PassengerCount = a.PassengerCount,
        Status = a.Status,
        CreatedAt = a.CreatedAt
    };
}
