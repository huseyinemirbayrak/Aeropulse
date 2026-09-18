using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

/// <summary>
/// Jet Bridge management service.
/// 
/// Most critical feature: CONFLICT CHECK
/// When assigning a jet bridge, it checks if there is already another aircraft at that bridge.
/// If yes:
///   - Returns HTTP 409 Conflict
///   - Suggests available alternative bridges in the same terminal
/// 
/// Status flow:
///   Planned → AircraftLanded → BridgeConnected → DisembarkingComplete → Released
///   On every transition, an event is published to the Event Bus + Cache is updated.
/// </summary>
public class JetBridgeService : IJetBridgeService
{
    private readonly IAeroPulseDbContext _context;
    private readonly IMessageBusService _messageBus;
    private readonly ICacheService _cache;
    private readonly INotificationService _notificationService;

    // Cache keys
    private const string AVAILABLE_BRIDGES_CACHE_KEY = "jetbridges:available:{0}"; // {0} = terminalNo
    private static readonly TimeSpan CACHE_TTL = TimeSpan.FromMinutes(2); // 2 minutes cache

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

    // ===================== JET BRIDGE CRUD =====================

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

        // Clear cache (new bridge added)
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

        // Clear cache
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

    // ===================== ASSIGNMENT CRUD =====================

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

    /// <summary>
    /// Creates a new jet bridge assignment.
    /// 
    /// CONFLICT CHECK FLOW:
    ///   1. Is there an existing assignment for the requested bridge + time range? → CheckAvailabilityAsync()
    ///   2. If yes: Return 409 Conflict + alternative bridge suggestion
    ///   3. If no: Create assignment, set bridge status to "Reserved", clear cache
    /// </summary>
    public async Task<ApiResponse<JetBridgeAssignmentDto>> CreateAssignmentAsync(CreateJetBridgeAssignmentDto request)
    {
        var bridge = await _context.JetBridges.FindAsync(request.JetBridgeId);
        if (bridge == null) return ApiResponse<JetBridgeAssignmentDto>.Fail("Jet bridge not found.");

        if (bridge.StatusCode == JetBridgeStatus.UnderMaintenance)
            return ApiResponse<JetBridgeAssignmentDto>.Fail($"Jet bridge {bridge.BridgeNo} is under maintenance, assignment cannot be made.");

        // ===== CONFLICT CHECK =====
        var conflictCheck = await CheckAvailabilityAsync(
            request.JetBridgeId,
            request.EstimatedArrivalTime,
            request.EstimatedDepartureTime
        );

        if (conflictCheck.HasConflict)
        {
            // The API controller will return 409 Conflict upon seeing this result
            // Alternative bridges are in conflictCheck.AlternativeBridges
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

        // Set jet bridge status to "Reserved"
        bridge.StatusCode = JetBridgeStatus.Reserved;
        bridge.UpdatedAt = DateTime.UtcNow;

        _context.JetBridgeAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        // Clear cache
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));

        var created = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .FirstAsync(a => a.Id == assignment.Id);

        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(created), "Jet bridge assignment created.");
    }

    /// <summary>
    /// Manages the status flow: Planned → AircraftLanded → BridgeConnected → DisembarkingComplete → Released
    /// On each transition:
    ///   - Notification is published to the Event Bus
    ///   - In-app notification is sent to relevant users
    ///   - Cache is updated
    /// </summary>
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

        // Status-based specific actions
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
                // Jet bridge becomes available again
                assignment.JetBridge.StatusCode = JetBridgeStatus.Available;
                break;
        }

        assignment.JetBridge.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Clear cache (bridge status changed)
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, assignment.JetBridge.TerminalNo));

        // ===== EVENT MESSAGE (EVENT BUS) + NOTIFICATION =====
        await PublishStatusChangeAsync(assignment, previousStatus, request.NewStatus);

        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(assignment),
            $"Jet bridge status updated to '{request.NewStatus}'.");
    }

    /// <summary>
    /// CONFLICT CHECK ALGORITHM
    /// 
    /// Logic: Do the two time periods overlap?
    ///   A = [start, end] (new assignment)
    ///   B = [existing.ETA, existing.DisconnectionTime] (existing assignment)
    ///   Conflict = A.start < B.end AND A.end > B.start
    /// 
    /// Example: 
    ///   Existing: 14:00 - 16:00
    ///   New:      15:00 - 17:00  → CONFLICT EXISTS (15:00 < 16:00 and 17:00 > 14:00)
    ///   New:      12:00 - 14:00  → NO CONFLICT (12:00 < 16:00 but 14:00 is not < 14:00)
    /// </summary>
    public async Task<JetBridgeConflictResultDto> CheckAvailabilityAsync(Guid jetBridgeId, DateTime start, DateTime end, Guid? excludeAssignmentId = null)
    {
        var conflictingAssignment = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .Where(a =>
                a.JetBridgeId == jetBridgeId &&
                a.Status != JetBridgeAssignmentStatus.Released && // Released bridges do not conflict
                (excludeAssignmentId == null || a.Id != excludeAssignmentId) &&
                start < (a.DisconnectionTime ?? a.EstimatedArrivalTime.AddHours(3)) && // A.start < B.end
                end > a.EstimatedArrivalTime                                             // A.end > B.start
            )
            .FirstOrDefaultAsync();

        if (conflictingAssignment == null)
        {
            // No conflict — bridge is available
            return new JetBridgeConflictResultDto { HasConflict = false, Message = "Jet bridge is available." };
        }

        // Conflict exists — suggest alternative empty bridges in the same terminal
        var bridge = await _context.JetBridges.FindAsync(jetBridgeId);
        var alternatives = await GetAvailableBridgesForPeriodAsync(bridge!.TerminalNo, start, end, jetBridgeId);

        return new JetBridgeConflictResultDto
        {
            HasConflict = true,
            Message = $"⚠️ Bridge {bridge.BridgeNo} is occupied between {conflictingAssignment.EstimatedArrivalTime:HH:mm}-{(conflictingAssignment.DisconnectionTime ?? conflictingAssignment.EstimatedArrivalTime.AddHours(3)):HH:mm}! " +
                      (alternatives.Any()
                          ? $"Alternative bridges: {string.Join(", ", alternatives.Select(a => a.BridgeNo))}"
                          : "There are no available bridges at this terminal for that time."),
            ConflictingAssignment = MapAssignmentToDto(conflictingAssignment),
            AlternativeBridges = alternatives.Select(MapToDto).ToList()
        };
    }

    /// <summary>
    /// Gets available bridges from cache.
    /// If cache miss, reads from DB and caches (2 mins TTL).
    /// </summary>
    public async Task<ApiResponse<List<JetBridgeDto>>> GetAvailableBridgesAsync(string terminalNo)
    {
        var cacheKey = string.Format(AVAILABLE_BRIDGES_CACHE_KEY, terminalNo);

        // Check cache first
        var cached = await _cache.GetAsync<List<JetBridgeDto>>(cacheKey);
        if (cached != null)
            return ApiResponse<List<JetBridgeDto>>.Ok(cached, "Retrieved from cache.");

        // Cache miss — read from DB
        var bridges = await _context.JetBridges
            .Where(j => j.TerminalNo == terminalNo && j.StatusCode == JetBridgeStatus.Available)
            .OrderBy(j => j.BridgeNo)
            .ToListAsync();

        var dtos = bridges.Select(MapToDto).ToList();

        // Cache it
        await _cache.SetAsync(cacheKey, dtos, CACHE_TTL);

        return ApiResponse<List<JetBridgeDto>>.Ok(dtos, "Retrieved from database and cached.");
    }

    // ===================== HELPER METHODS =====================

    private async Task<List<JetBridge>> GetAvailableBridgesForPeriodAsync(string terminalNo, DateTime start, DateTime end, Guid excludeBridgeId)
    {
        // Get ALL bridges in the same terminal
        var allBridges = await _context.JetBridges
            .Where(j => j.TerminalNo == terminalNo && j.Id != excludeBridgeId && j.StatusCode != JetBridgeStatus.UnderMaintenance)
            .ToListAsync();

        // Check conflict for each bridge
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
                $"✈️ Flight {assignment.Operation?.FlightNumber} connected to bridge {assignment.JetBridge.TerminalNo}/{assignment.JetBridge.BridgeNo} at {DateTime.UtcNow:HH:mm}. Passenger disembarking can start.",
            JetBridgeAssignmentStatus.AircraftLanded =>
                $"🛬 Aircraft {assignment.Aircraft?.TailNumber} ({assignment.Operation?.FlightNumber}) landed. Jet bridge is being prepared.",
            JetBridgeAssignmentStatus.DisembarkingComplete =>
                $"✅ Passenger disembarking completed for flight {assignment.Operation?.FlightNumber}. Aircraft can detach from bridge {assignment.JetBridge.BridgeNo}.",
            JetBridgeAssignmentStatus.Released =>
                $"🔓 Bridge {assignment.JetBridge.BridgeNo} has been released. Available for new assignment.",
            _ => $"Jet bridge status: {newStatus}"
        };

        // Publish to event bus
        await _messageBus.PublishAsync($"jetbridge.{eventType.ToLower()}", new BridgeStatusMessage
        {
            EventType = eventType,
            FlightNumber = assignment.Operation?.FlightNumber ?? "—",
            BridgeNo = assignment.JetBridge.BridgeNo,
            TerminalNo = assignment.JetBridge.TerminalNo,
            Message = message
        });

        // Send notification to operations manager + field technician on BridgeConnected
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
