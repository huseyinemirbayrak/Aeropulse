using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Application.Services;

/// <summary>
/// Yer hizmetleri operasyon yönetim servisi.
/// 
/// En kritik özellik: CloseWithSLAAsync metodu.
/// Bu metot bir "transaction" kullanır — yani iki işlemi birlikte yapar:
///   1. Operasyonu "Tamamlandı" olarak kapatır
///   2. SLA (Hizmet Seviyesi Anlaşması) kaydı oluşturur
/// Eğer bu iki işlemden biri başarısız olursa, ikisi de GERİ ALINIR.
/// Bu, banka transferlerindeki "ya ikisi de olsun ya da hiçbirisi" mantığıyla aynıdır.
/// </summary>
public class OperationService : IOperationService
{
    private readonly IAeroPulseDbContext _context;

    // "Standart turnaround süresi" — gerçek havacılıkta uçak tipine göre değişir
    // SLA ihlal kontrolü için referans değer (dakika)
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
            return ApiResponse<OperationDto>.Fail("Operasyon bulunamadı.");

        return ApiResponse<OperationDto>.Ok(MapToDto(operation));
    }

    public async Task<ApiResponse<OperationDto>> CreateAsync(CreateOperationDto request)
    {
        // Aynı sefere ait başka bir aktif operasyon var mı kontrol et
        if (await _context.Operations.AnyAsync(o =>
            o.FlightNumber == request.FlightNumber &&
            o.Status != OperationStatus.Completed &&
            o.Status != OperationStatus.Cancelled))
        {
            return ApiResponse<OperationDto>.Fail($"'{request.FlightNumber}' seferi için zaten aktif bir operasyon var.");
        }

        var aircraft = await _context.Aircraft.FindAsync(request.AircraftId);
        if (aircraft == null)
            return ApiResponse<OperationDto>.Fail("Uçak bulunamadı.");

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

        // Yeniden yükle
        var created = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstAsync(o => o.Id == operation.Id);

        return ApiResponse<OperationDto>.Ok(MapToDto(created), "Operasyon başarıyla oluşturuldu.");
    }

    public async Task<ApiResponse<OperationDto>> UpdateAsync(Guid id, UpdateOperationDto request)
    {
        var operation = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (operation == null)
            return ApiResponse<OperationDto>.Fail("Operasyon bulunamadı.");

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
        return ApiResponse<OperationDto>.Ok(MapToDto(operation), "Operasyon güncellendi.");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var operation = await _context.Operations.FindAsync(id);
        if (operation == null)
            return ApiResponse<bool>.Fail("Operasyon bulunamadı.");

        if (operation.Status == OperationStatus.InProgress)
            return ApiResponse<bool>.Fail("Devam eden operasyon silinemez. Önce iptal edin.");

        _context.Operations.Remove(operation);
        await _context.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Operasyon silindi.");
    }

    /// <summary>
    /// *** TRANSACTION METODU ***
    /// 
    /// Bu metot iki işlemi atomik olarak gerçekleştirir:
    ///   1. Operation.Status → Completed güncellenir
    ///   2. SLA kaydı (Notification + meta) oluşturulur
    /// 
    /// Benzetme: Bir sözleşmeyi imzalamak gibi — hem imzalı kopyayı verirsin,
    /// hem de kayıt defterine yazarsın. İkisi de olmazsa hiçbiri geçerli sayılmaz.
    /// </summary>
    public async Task<ApiResponse<SLARecordDto>> CloseWithSLAAsync(Guid id, CloseOperationDto request)
    {
        // EF Core DbContext zaten bir Unit of Work sağlar,
        // transaction için Database.BeginTransactionAsync() kullanıyoruz
        var dbContext = (_context as Microsoft.EntityFrameworkCore.DbContext)!;

        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        try
        {
            // ===== ADIM 1: Operasyonu kapat =====
            var operation = await _context.Operations
                .Include(o => o.Aircraft)
                .Include(o => o.OperationsManager)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (operation == null)
            {
                await transaction.RollbackAsync();
                return ApiResponse<SLARecordDto>.Fail("Operasyon bulunamadı.");
            }

            if (operation.Status == OperationStatus.Completed)
            {
                await transaction.RollbackAsync();
                return ApiResponse<SLARecordDto>.Fail("Bu operasyon zaten kapatılmış.");
            }

            // Gecikme bilgilerini güncelle
            operation.Status = OperationStatus.Completed;
            operation.DelayMinutes = request.DelayMinutes;
            if (request.DelayReason != null) operation.DelayReason = request.DelayReason;
            operation.UpdatedAt = DateTime.UtcNow;

            // ===== ADIM 2: SLA kaydı oluştur =====
            var turnaroundMinutes = (int)(DateTime.UtcNow - operation.ArrivalTime).TotalMinutes;
            var metSLA = turnaroundMinutes <= STANDARD_TURNAROUND_SLA_MINUTES;

            // SLA sonucunu Notification olarak kaydet
            var slaNotification = new Notification
            {
                RecipientUserId = operation.OperationsManagerId ?? Guid.Empty,
                Message = metSLA
                    ? $"✅ SLA BAŞARILI: {operation.FlightNumber} seferi {turnaroundMinutes} dakikada tamamlandı. (SLA limiti: {STANDARD_TURNAROUND_SLA_MINUTES} dk)"
                    : $"⚠️ SLA İHLALİ: {operation.FlightNumber} seferi {turnaroundMinutes} dakika sürdü! (SLA limiti: {STANDARD_TURNAROUND_SLA_MINUTES} dk, {turnaroundMinutes - STANDARD_TURNAROUND_SLA_MINUTES} dk aşıldı)",
                NotificationType = metSLA ? NotificationType.OperationCompleted : NotificationType.SLABreached,
                Date = DateTime.UtcNow,
                IsRead = false
            };

            // operationsManagerId null ise admin'e yolla
            if (operation.OperationsManagerId == null)
            {
                // Admin kullanıcıya gönder
                var admin = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin);
                if (admin != null) slaNotification.RecipientUserId = admin.Id;
            }

            _context.Notifications.Add(slaNotification);

            // ===== HER İKİ ADIMI DA KAYDET (ya ikisi de olsun ya da hiçbirisi) =====
            await _context.SaveChangesAsync();

            // ===== BAŞARILI: COMMIT =====
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
                metSLA ? "Operasyon başarıyla kapatıldı. SLA hedefi tutturuldu! ✅"
                       : "Operasyon kapatıldı ancak SLA ihlali tespit edildi. ⚠️");
        }
        catch (Exception ex)
        {
            // ===== HATA: ROLLBACK — her iki işlem de geri alınır =====
            await transaction.RollbackAsync();
            return ApiResponse<SLARecordDto>.Fail($"İşlem başarısız, tüm değişiklikler geri alındı: {ex.Message}");
        }
    }

    public async Task<ApiResponse<OperationChecklistDto>> GetChecklistAsync(Guid id)
    {
        var operation = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.OperationsManager)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (operation == null)
            return ApiResponse<OperationChecklistDto>.Fail("Operasyon bulunamadı.");

        // Standart turnaround checklist adımları
        // Gerçek bir havalimanında bu adımlar dijital sistemde takip edilir
        var checklistItems = new List<OperationChecklistItemDto>
        {
            new() { Step = "🛬 Uçak kapıya (gate) yanaştı", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "🔗 Körük (jet bridge) bağlandı", IsCompleted = operation.JetBridgeAssignments.Any(j => j.Status >= JetBridgeAssignmentStatus.BridgeConnected) },
            new() { Step = "🚌 Merdiven/araç pozisyonlandı", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "👥 Yolcu inişi başladı", IsCompleted = operation.JetBridgeAssignments.Any(j => j.Status >= JetBridgeAssignmentStatus.BridgeConnected) },
            new() { Step = "🧳 Bagaj boşaltma başladı", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "⛽ Yakıt ikmali", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "🍽️ Catering (ikram) teslimi", IsCompleted = operation.Status >= OperationStatus.InProgress },
            new() { Step = "🧹 Kabin temizliği tamamlandı", IsCompleted = operation.Status >= OperationStatus.Completed },
            new() { Step = "✈️ Yeni yolcu binişi tamamlandı", IsCompleted = operation.Status == OperationStatus.Completed },
            new() { Step = "📋 Kalkış belgesi imzalandı", IsCompleted = operation.Status == OperationStatus.Completed },
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
