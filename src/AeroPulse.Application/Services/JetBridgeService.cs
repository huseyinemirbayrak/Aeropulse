using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

/// <summary>
/// Körük (Jet Bridge) yönetim servisi.
/// 
/// En kritik özellik: ÇAKIŞMA KONTROLÜ
/// Bir köprüye atama yapılırken, o köprüde zaten başka bir uçak var mı kontrol edilir.
/// Varsa:
///   - HTTP 409 Conflict döner
///   - Aynı terminaldeki boş köprüler önerilir
/// 
/// Durum akışı:
///   Planned → AircraftLanded → BridgeConnected → DisembarkingComplete → Released
///   Her geçişte RabbitMQ'ya mesaj yayınlanır + Redis cache güncellenir.
/// </summary>
public class JetBridgeService : IJetBridgeService
{
    private readonly IAeroPulseDbContext _context;
    private readonly IMessageBusService _messageBus;
    private readonly ICacheService _cache;
    private readonly INotificationService _notificationService;

    // Redis cache key'leri
    private const string AVAILABLE_BRIDGES_CACHE_KEY = "jetbridges:available:{0}"; // {0} = terminalNo
    private static readonly TimeSpan CACHE_TTL = TimeSpan.FromMinutes(2); // 2 dakika cache

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

        if (bridge == null) return ApiResponse<JetBridgeDto>.Fail("Körük bulunamadı.");
        return ApiResponse<JetBridgeDto>.Ok(MapToDto(bridge));
    }

    public async Task<ApiResponse<JetBridgeDto>> CreateAsync(CreateJetBridgeDto request)
    {
        if (await _context.JetBridges.AnyAsync(j => j.TerminalNo == request.TerminalNo && j.BridgeNo == request.BridgeNo))
            return ApiResponse<JetBridgeDto>.Fail($"{request.TerminalNo} terminalinde {request.BridgeNo} numaralı körük zaten mevcut.");

        var bridge = new JetBridge
        {
            BridgeNo = request.BridgeNo,
            TerminalNo = request.TerminalNo,
            StatusCode = request.StatusCode
        };

        _context.JetBridges.Add(bridge);
        await _context.SaveChangesAsync();

        // Cache'i temizle (yeni köprü eklendi)
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, request.TerminalNo));

        return ApiResponse<JetBridgeDto>.Ok(MapToDto(bridge), "Körük eklendi.");
    }

    public async Task<ApiResponse<JetBridgeDto>> UpdateAsync(Guid id, UpdateJetBridgeDto request)
    {
        var bridge = await _context.JetBridges.FindAsync(id);
        if (bridge == null) return ApiResponse<JetBridgeDto>.Fail("Körük bulunamadı.");

        var oldTerminal = bridge.TerminalNo;
        if (request.BridgeNo != null) bridge.BridgeNo = request.BridgeNo;
        if (request.TerminalNo != null) bridge.TerminalNo = request.TerminalNo;
        if (request.StatusCode.HasValue) bridge.StatusCode = request.StatusCode.Value;
        bridge.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Cache temizle
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, oldTerminal));
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));

        return ApiResponse<JetBridgeDto>.Ok(MapToDto(bridge), "Körük güncellendi.");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var bridge = await _context.JetBridges.FindAsync(id);
        if (bridge == null) return ApiResponse<bool>.Fail("Körük bulunamadı.");

        if (bridge.StatusCode == JetBridgeStatus.Connected)
            return ApiResponse<bool>.Fail("Bağlı durumundaki körük silinemez.");

        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));
        _context.JetBridges.Remove(bridge);
        await _context.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Körük silindi.");
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

        if (assignment == null) return ApiResponse<JetBridgeAssignmentDto>.Fail("Atama bulunamadı.");
        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(assignment));
    }

    /// <summary>
    /// Yeni körük ataması yapar.
    /// 
    /// ÇAKIŞMA KONTROLÜ AKIŞI:
    ///   1. İstenen köprü + zaman aralığında mevcut atama var mı? → CheckAvailabilityAsync()
    ///   2. Varsa: 409 Conflict + alternatif köprü önerisi döndür
    ///   3. Yoksa: Atama oluştur, köprü durumunu "Reserved" yap, cache temizle
    /// </summary>
    public async Task<ApiResponse<JetBridgeAssignmentDto>> CreateAssignmentAsync(CreateJetBridgeAssignmentDto request)
    {
        var bridge = await _context.JetBridges.FindAsync(request.JetBridgeId);
        if (bridge == null) return ApiResponse<JetBridgeAssignmentDto>.Fail("Körük bulunamadı.");

        if (bridge.StatusCode == JetBridgeStatus.UnderMaintenance)
            return ApiResponse<JetBridgeAssignmentDto>.Fail($"Körük {bridge.BridgeNo} bakımda, atama yapılamaz.");

        // ===== ÇAKIŞMA KONTROLÜ =====
        var conflictCheck = await CheckAvailabilityAsync(
            request.JetBridgeId,
            request.EstimatedArrivalTime,
            request.EstimatedDepartureTime
        );

        if (conflictCheck.HasConflict)
        {
            // API controller bu sonucu görünce 409 Conflict dönecek
            // Alternatif köprüler conflictCheck.AlternativeBridges içinde
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

        // Körük durumunu "Reserved" yap
        bridge.StatusCode = JetBridgeStatus.Reserved;
        bridge.UpdatedAt = DateTime.UtcNow;

        _context.JetBridgeAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        // Cache temizle
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, bridge.TerminalNo));

        var created = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .FirstAsync(a => a.Id == assignment.Id);

        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(created), "Körük ataması oluşturuldu.");
    }

    /// <summary>
    /// Durum akışını yönetir: Planlandi → UcakIndi → KopruBagli → YolcuInisiTamamlandi → Serbest
    /// Her geçişte:
    ///   - RabbitMQ'ya bildirim yayınlanır
    ///   - İlgili kullanıcılara in-app bildirim gönderilir
    ///   - Redis cache güncellenir
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
            return ApiResponse<JetBridgeAssignmentDto>.Fail("Atama bulunamadı.");

        var previousStatus = assignment.Status;
        assignment.Status = request.NewStatus;
        assignment.UpdatedAt = DateTime.UtcNow;

        // Durum bazlı özel işlemler
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
                // Körük tekrar boşa çıkıyor
                assignment.JetBridge.StatusCode = JetBridgeStatus.Available;
                break;
        }

        assignment.JetBridge.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Cache temizle (körük durumu değişti)
        await _cache.RemoveAsync(string.Format(AVAILABLE_BRIDGES_CACHE_KEY, assignment.JetBridge.TerminalNo));

        // ===== RabbitMQ MESAJI + BİLDİRİM =====
        await PublishStatusChangeAsync(assignment, previousStatus, request.NewStatus);

        return ApiResponse<JetBridgeAssignmentDto>.Ok(MapAssignmentToDto(assignment),
            $"Körük durumu '{request.NewStatus}' olarak güncellendi.");
    }

    /// <summary>
    /// ÇAKIŞMA KONTROLÜ ALGORİTMASI
    /// 
    /// Mantık: İki zaman aralığı çakışıyor mu?
    ///   A = [start, end] (yeni atama)
    ///   B = [mevcut.ETA, mevcut.DisconnectionTime] (var olan atama)
    ///   Çakışma = A.start < B.end VE A.end > B.start
    /// 
    /// Örnek: 
    ///   Mevcut: 14:00 - 16:00
    ///   Yeni:   15:00 - 17:00  → ÇAKIŞMA VAR (15:00 < 16:00 ve 17:00 > 14:00)
    ///   Yeni:   12:00 - 14:00  → ÇAKIŞMA YOK (12:00 < 16:00 ama 14:00 = 14:00 değil < 14:00)
    /// </summary>
    public async Task<JetBridgeConflictResultDto> CheckAvailabilityAsync(Guid jetBridgeId, DateTime start, DateTime end, Guid? excludeAssignmentId = null)
    {
        var conflictingAssignment = await _context.JetBridgeAssignments
            .Include(a => a.JetBridge)
            .Include(a => a.Aircraft)
            .Include(a => a.Operation)
            .Where(a =>
                a.JetBridgeId == jetBridgeId &&
                a.Status != JetBridgeAssignmentStatus.Released && // Serbest bırakılmış köprüler çakışmaz
                (excludeAssignmentId == null || a.Id != excludeAssignmentId) &&
                start < (a.DisconnectionTime ?? a.EstimatedArrivalTime.AddHours(3)) && // A.start < B.end
                end > a.EstimatedArrivalTime                                             // A.end > B.start
            )
            .FirstOrDefaultAsync();

        if (conflictingAssignment == null)
        {
            // Çakışma yok — köprü müsait
            return new JetBridgeConflictResultDto { HasConflict = false, Message = "Körük müsait." };
        }

        // Çakışma var — aynı terminaldeki alternatif boş köprüleri öner
        var bridge = await _context.JetBridges.FindAsync(jetBridgeId);
        var alternatives = await GetAvailableBridgesForPeriodAsync(bridge!.TerminalNo, start, end, jetBridgeId);

        return new JetBridgeConflictResultDto
        {
            HasConflict = true,
            Message = $"⚠️ {bridge.BridgeNo} köprüsü {conflictingAssignment.EstimatedArrivalTime:HH:mm}-{(conflictingAssignment.DisconnectionTime ?? conflictingAssignment.EstimatedArrivalTime.AddHours(3)):HH:mm} aralığında dolu! " +
                      (alternatives.Any()
                          ? $"Alternatif köprüler: {string.Join(", ", alternatives.Select(a => a.BridgeNo))}"
                          : "Bu terminalde o saatte boş köprü bulunmuyor."),
            ConflictingAssignment = MapAssignmentToDto(conflictingAssignment),
            AlternativeBridges = alternatives.Select(MapToDto).ToList()
        };
    }

    /// <summary>
    /// Redis cache'ten boş köprüleri getirir.
    /// Cache yoksa DB'den okur ve cache'ler (2 dakika TTL).
    /// </summary>
    public async Task<ApiResponse<List<JetBridgeDto>>> GetAvailableBridgesAsync(string terminalNo)
    {
        var cacheKey = string.Format(AVAILABLE_BRIDGES_CACHE_KEY, terminalNo);

        // Önce cache'e bak
        var cached = await _cache.GetAsync<List<JetBridgeDto>>(cacheKey);
        if (cached != null)
            return ApiResponse<List<JetBridgeDto>>.Ok(cached, "Cache'ten getirildi.");

        // Cache miss — DB'den oku
        var bridges = await _context.JetBridges
            .Where(j => j.TerminalNo == terminalNo && j.StatusCode == JetBridgeStatus.Available)
            .OrderBy(j => j.BridgeNo)
            .ToListAsync();

        var dtos = bridges.Select(MapToDto).ToList();

        // Cache'le
        await _cache.SetAsync(cacheKey, dtos, CACHE_TTL);

        return ApiResponse<List<JetBridgeDto>>.Ok(dtos, "Veritabanından getirildi ve cache'lendi.");
    }

    // ===================== YARDIMCI METODLAR =====================

    private async Task<List<JetBridge>> GetAvailableBridgesForPeriodAsync(string terminalNo, DateTime start, DateTime end, Guid excludeBridgeId)
    {
        // Aynı terminaldeki TÜM köprüleri al
        var allBridges = await _context.JetBridges
            .Where(j => j.TerminalNo == terminalNo && j.Id != excludeBridgeId && j.StatusCode != JetBridgeStatus.UnderMaintenance)
            .ToListAsync();

        // Her köprü için çakışma kontrolü yap
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
            JetBridgeAssignmentStatus.BridgeConnected => "KopruBagli",
            JetBridgeAssignmentStatus.AircraftLanded => "UcakIndi",
            JetBridgeAssignmentStatus.DisembarkingComplete => "YolcuInisiTamamlandi",
            JetBridgeAssignmentStatus.Released => "KopruSerbest",
            _ => "StatusDegisti"
        };

        var message = newStatus switch
        {
            JetBridgeAssignmentStatus.BridgeConnected =>
                $"✈️ {assignment.Operation?.FlightNumber} seferli uçak {DateTime.UtcNow:HH:mm}'de {assignment.JetBridge.TerminalNo}/{assignment.JetBridge.BridgeNo} köprüsüne bağlandı. Yolcu inişi başlayabilir.",
            JetBridgeAssignmentStatus.AircraftLanded =>
                $"🛬 {assignment.Aircraft?.TailNumber} ({assignment.Operation?.FlightNumber}) indi. Körük hazırlanıyor.",
            JetBridgeAssignmentStatus.DisembarkingComplete =>
                $"✅ {assignment.Operation?.FlightNumber} seferinin yolcu inişi tamamlandı. Uçak {assignment.JetBridge.BridgeNo}'den ayrılabilir.",
            JetBridgeAssignmentStatus.Released =>
                $"🔓 {assignment.JetBridge.BridgeNo} köprüsü serbest bırakıldı. Yeni atama için müsait.",
            _ => $"Körük durumu: {newStatus}"
        };

        // RabbitMQ'ya yayınla
        await _messageBus.PublishAsync($"jetbridge.{eventType.ToLower()}", new BridgeStatusMessage
        {
            EventType = eventType,
            FlightNumber = assignment.Operation?.FlightNumber ?? "—",
            BridgeNo = assignment.JetBridge.BridgeNo,
            TerminalNo = assignment.JetBridge.TerminalNo,
            Message = message
        });

        // KopruBagli durumunda operasyon sorumlusuna + saha teknisyenine bildirim
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
