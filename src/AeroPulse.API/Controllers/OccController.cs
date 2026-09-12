using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Application.Services;
using AeroPulse.Domain.Entities;
using AeroPulse.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.API.Controllers;

/// <summary>
/// Operasyon Kontrol Merkezi (OCC) ve Turnaround Yönetimi API Controller'ı
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OccController : ControllerBase
{
    private readonly IAeroPulseDbContext _context;
    private readonly IMessageBusService _messageBus;

    public OccController(IAeroPulseDbContext context, IMessageBusService messageBus)
    {
        _context = context;
        _messageBus = messageBus;
    }

    // OCC sayfasi icin genel durum ozeti
    [HttpGet("overview")]
    [Authorize(Roles = "Admin,OperationsManager,MROEngineer,Viewer,FieldTechnician")]
    public async Task<IActionResult> GetOverview()
    {
        var runways = await _context.Runways.ToListAsync();
        var gates = await _context.Gates.ToListAsync();
        var operations = await _context.Operations
            .Include(o => o.Aircraft)
            .OrderBy(o => o.ArrivalTime)
            .ToListAsync();
        var gseList = await _context.GroundSupportEquipments.ToListAsync();

        var overview = new
        {
            TotalRunways = runways.Count,
            AvailableRunways = runways.Count(r => r.Status == RunwayStatus.Available),
            TotalGates = gates.Count,
            AvailableGates = gates.Count(g => g.Status == GateStatus.Available),
            OccupiedGates = gates.Count(g => g.Status == GateStatus.Occupied),
            ActiveOperations = operations.Count(o => o.Status == OperationStatus.InProgress || o.Status == OperationStatus.Scheduled),
            DelayedOperations = operations.Count(o => o.Status == OperationStatus.Delayed || o.DelayMinutes > 0),
            TotalGSE = gseList.Count,
            IdleGSE = gseList.Count(g => g.Status == GSEStatus.Idle),
            BusyGSE = gseList.Count(g => g.Status == GSEStatus.Busy),
            OutOfServiceGSE = gseList.Count(g => g.Status == GSEStatus.OutOfService),
            Runways = runways.Select(r => new RunwayDto
            {
                Id = r.Id,
                RunwayCode = r.RunwayCode,
                Status = r.Status,
                LengthMeters = r.LengthMeters,
                SurfaceType = r.SurfaceType,
                CurrentFlightNumber = r.CurrentFlightNumber,
                StatusChangedAt = r.StatusChangedAt
            }),
            Gates = gates.Select(g => new GateDto
            {
                Id = g.Id,
                GateNumber = g.GateNumber,
                TerminalCode = g.TerminalCode,
                HasJetBridge = g.HasJetBridge,
                Status = g.Status,
                CurrentFlightNumber = g.CurrentFlightNumber,
                CurrentAircraftId = g.CurrentAircraftId
            }),
            UpcomingFlights = operations.Take(10).Select(o => new
            {
                o.Id,
                o.FlightNumber,
                TailNumber = o.Aircraft?.TailNumber,
                AircraftModel = o.Aircraft?.Model,
                o.GateNo,
                o.AssignedRunwayCode,
                o.ArrivalTime,
                o.DepartureTime,
                Status = o.Status.ToString(),
                o.DelayMinutes,
                o.DelayReason
            })
        };

        return Ok(ApiResponse<object>.Ok(overview));
    }

    // aktif pistleri listeler
    [HttpGet("runways")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician,MROEngineer")]
    public async Task<IActionResult> GetRunways()
    {
        var runways = await _context.Runways
            .OrderBy(r => r.RunwayCode)
            .Select(r => new RunwayDto
            {
                Id = r.Id,
                RunwayCode = r.RunwayCode,
                Status = r.Status,
                LengthMeters = r.LengthMeters,
                SurfaceType = r.SurfaceType,
                CurrentFlightNumber = r.CurrentFlightNumber,
                StatusChangedAt = r.StatusChangedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<List<RunwayDto>>.Ok(runways));
    }

    // pist durumunu guncelle (inis / kalkis / bakim)
    [HttpPut("runways/{id}/status")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> UpdateRunwayStatus(Guid id, [FromBody] UpdateRunwayStatusDto dto)
    {
        var runway = await _context.Runways.FindAsync(id);
        if (runway == null) return NotFound(ApiResponse<object>.Fail("Pist bulunamadı."));

        runway.Status = dto.Status;
        runway.CurrentFlightNumber = dto.CurrentFlightNumber;
        runway.StatusChangedAt = DateTime.UtcNow;
        runway.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(runway, "Pist durumu güncellendi."));
    }

    // tum kapi ve koruklerin listesi
    [HttpGet("gates")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician,MROEngineer")]
    public async Task<IActionResult> GetGates()
    {
        var gates = await _context.Gates
            .Include(g => g.CurrentAircraft)
            .OrderBy(g => g.GateNumber)
            .Select(g => new GateDto
            {
                Id = g.Id,
                GateNumber = g.GateNumber,
                TerminalCode = g.TerminalCode,
                HasJetBridge = g.HasJetBridge,
                Status = g.Status,
                CurrentFlightNumber = g.CurrentFlightNumber,
                CurrentAircraftId = g.CurrentAircraftId,
                CurrentAircraftTailNumber = g.CurrentAircraft != null ? g.CurrentAircraft.TailNumber : null
            })
            .ToListAsync();

        return Ok(ApiResponse<List<GateDto>>.Ok(gates));
    }

    // kapiyi manuel degistirme (override)
    [HttpPost("gates/override")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> OverrideGate([FromBody] GateOverrideRequest request)
    {
        var op = await _context.Operations.FindAsync(request.OperationId);
        if (op == null) return NotFound(ApiResponse<object>.Fail("Operasyon/uçuş bulunamadı."));

        var oldGateNo = op.GateNo;
        op.GateNo = request.NewGateNumber;
        op.UpdatedAt = DateTime.UtcNow;

        // Eski kapıyı serbest bırak
        var oldGate = await _context.Gates.FirstOrDefaultAsync(g => g.GateNumber == oldGateNo);
        if (oldGate != null)
        {
            oldGate.Status = GateStatus.Available;
            oldGate.CurrentFlightNumber = null;
            oldGate.CurrentAircraftId = null;
        }

        // Yeni kapıyı rezerve et/doldur
        var newGate = await _context.Gates.FirstOrDefaultAsync(g => g.GateNumber == request.NewGateNumber);
        if (newGate != null)
        {
            newGate.Status = GateStatus.Occupied;
            newGate.CurrentFlightNumber = op.FlightNumber;
            newGate.CurrentAircraftId = op.AircraftId;
        }

        await _context.SaveChangesAsync();

        await _messageBus.PublishAsync("flight.gate.override", new FlightGateOverrideEvent
        {
            OperationId = op.Id,
            FlightNumber = op.FlightNumber,
            OldGateNumber = oldGateNo,
            NewGateNumber = op.GateNo,
            Reason = request.Reason,
            UpdatedAt = DateTime.UtcNow
        });

        return Ok(ApiResponse<object>.Ok(new { op.Id, op.FlightNumber, OldGate = oldGateNo, NewGate = op.GateNo, Reason = request.Reason },
            $"Uçuş {op.FlightNumber} için kapı {oldGateNo} -> {request.NewGateNumber} olarak güncellendi."));
    }

    /// <summary>
    /// Apron Yer Destek Ekipmanları (GSE) listesi
    /// </summary>
    [HttpGet("gse")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician,MROEngineer")]
    public async Task<IActionResult> GetGSE()
    {
        var gseList = await _context.GroundSupportEquipments
            .OrderBy(g => g.Code)
            .Select(g => new GSEDTO
            {
                Id = g.Id,
                Code = g.Code,
                Name = g.Name,
                Type = g.Type,
                Status = g.Status,
                FuelLevelPercentage = g.FuelLevelPercentage,
                ApronZone = g.ApronZone,
                Latitude = g.Latitude,
                Longitude = g.Longitude,
                OperatorName = g.OperatorName,
                CurrentTaskDescription = g.CurrentTaskDescription
            })
            .ToListAsync();

        return Ok(ApiResponse<List<GSEDTO>>.Ok(gseList));
    }

    /// <summary>
    /// GSE Araç Durumunu Güncelle (Boşta / Görevde / Bakımda)
    /// </summary>
    [HttpPut("gse/{id}/status")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> UpdateGSEStatus(Guid id, [FromBody] UpdateGSEStatusDto dto)
    {
        var vehicle = await _context.GroundSupportEquipments.FindAsync(id);
        if (vehicle == null) return NotFound(ApiResponse<object>.Fail("Yer aracı bulunamadı."));

        vehicle.Status = dto.Status;
        if (!string.IsNullOrEmpty(dto.ApronZone)) vehicle.ApronZone = dto.ApronZone;
        if (dto.FuelLevelPercentage.HasValue) vehicle.FuelLevelPercentage = dto.FuelLevelPercentage.Value;
        if (dto.CurrentTaskDescription != null) vehicle.CurrentTaskDescription = dto.CurrentTaskDescription;
        vehicle.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _messageBus.PublishAsync("gse.status.changed", new GSEStatusChangedEvent
        {
            GSEId = vehicle.Id,
            Code = vehicle.Code,
            Name = vehicle.Name,
            Type = vehicle.Type.ToString(),
            Status = vehicle.Status.ToString(),
            FuelLevelPercentage = vehicle.FuelLevelPercentage,
            ApronZone = vehicle.ApronZone,
            CurrentTaskDescription = vehicle.CurrentTaskDescription,
            UpdatedAt = DateTime.UtcNow
        });

        return Ok(ApiResponse<object>.Ok(vehicle, $"Araç {vehicle.Code} durumu {vehicle.Status} olarak güncellendi."));
    }

    /// <summary>
    /// GSE Araca Yakıt / Şarj İkmali Yap (%100)
    /// </summary>
    [HttpPut("gse/{id}/refuel")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> RefuelGSE(Guid id)
    {
        var vehicle = await _context.GroundSupportEquipments.FindAsync(id);
        if (vehicle == null) return NotFound(ApiResponse<object>.Fail("Yer aracı bulunamadı."));

        vehicle.FuelLevelPercentage = 100;
        vehicle.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _messageBus.PublishAsync("gse.status.changed", new GSEStatusChangedEvent
        {
            GSEId = vehicle.Id,
            Code = vehicle.Code,
            Name = vehicle.Name,
            Type = vehicle.Type.ToString(),
            Status = vehicle.Status.ToString(),
            FuelLevelPercentage = vehicle.FuelLevelPercentage,
            ApronZone = vehicle.ApronZone,
            CurrentTaskDescription = vehicle.CurrentTaskDescription,
            UpdatedAt = DateTime.UtcNow
        });

        return Ok(ApiResponse<object>.Ok(vehicle, $"Araç {vehicle.Code} yakıt/şarj seviyesi %100 yapıldı."));
    }

    /// <summary>
    /// Bir uçuşa ait Turnaround Görevleri ve Manifest Detayları (Redcap / Turnaround Ekranı)
    /// </summary>
    [HttpGet("turnaround/{operationId}")]
    [Authorize(Roles = "Admin,OperationsManager,Viewer,FieldTechnician,MROEngineer")]
    public async Task<IActionResult> GetTurnaroundDetail(Guid operationId)
    {
        var op = await _context.Operations
            .Include(o => o.Aircraft)
            .Include(o => o.TurnaroundTasks)
                .ThenInclude(t => t.AssignedGSE)
            .Include(o => o.TurnaroundTasks)
                .ThenInclude(t => t.AssignedUser)
            .Include(o => o.PassengerManifest)
            .FirstOrDefaultAsync(o => o.Id == operationId);

        if (op == null) return NotFound(ApiResponse<object>.Fail("Operasyon bulunamadı."));

        if (!op.TurnaroundTasks.Any())
        {
            var tanker = await _context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Type == GSEType.FuelTanker);
            var tug = await _context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Type == GSEType.BaggageTug);
            var pushback = await _context.GroundSupportEquipments.FirstOrDefaultAsync(g => g.Type == GSEType.PushbackTruck);

            var defaultTasks = new List<TurnaroundTask>
            {
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.BaggageUnload, Status = TurnaroundTaskStatus.Completed, ProgressPercentage = 100, TargetDurationMinutes = 20, ScheduledStartTime = op.ArrivalTime, ActualStartTime = op.ArrivalTime, ActualEndTime = op.ArrivalTime.AddMinutes(18), Notes = "Tüm gelen bagajlar boşaltıldı." },
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.Refueling, Status = TurnaroundTaskStatus.InProgress, ProgressPercentage = 65, TargetDurationMinutes = 25, ScheduledStartTime = op.ArrivalTime.AddMinutes(15), ActualStartTime = op.ArrivalTime.AddMinutes(15), AssignedGSEId = tanker?.Id, Notes = "Jet A-1 yakıt ikmali sürüyor (8.500 kg)." },
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.Cleaning, Status = TurnaroundTaskStatus.Completed, ProgressPercentage = 100, TargetDurationMinutes = 20, ScheduledStartTime = op.ArrivalTime.AddMinutes(10), ActualStartTime = op.ArrivalTime.AddMinutes(10), ActualEndTime = op.ArrivalTime.AddMinutes(25), Notes = "Kabin temizliği tamamlandı." },
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.Catering, Status = TurnaroundTaskStatus.InProgress, ProgressPercentage = 80, TargetDurationMinutes = 20, ScheduledStartTime = op.ArrivalTime.AddMinutes(20), ActualStartTime = op.ArrivalTime.AddMinutes(20), Notes = "Galley ve ikram yüklemesi sürüyor." },
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.BaggageLoad, Status = TurnaroundTaskStatus.InProgress, ProgressPercentage = 45, TargetDurationMinutes = 25, ScheduledStartTime = op.ArrivalTime.AddMinutes(25), ActualStartTime = op.ArrivalTime.AddMinutes(25), AssignedGSEId = tug?.Id, Notes = "Giden bagajlar ambara yükleniyor (130/154 adet)." },
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.Boarding, Status = TurnaroundTaskStatus.InProgress, ProgressPercentage = 70, TargetDurationMinutes = 30, ScheduledStartTime = op.DepartureTime.AddMinutes(-35), ActualStartTime = op.DepartureTime.AddMinutes(-35), Notes = "Yolcu binişi devam ediyor (162/180 yolcu)." },
                new() { Id = Guid.NewGuid(), OperationId = op.Id, TaskType = TurnaroundTaskType.Pushback, Status = TurnaroundTaskStatus.Pending, ProgressPercentage = 0, TargetDurationMinutes = 10, ScheduledStartTime = op.DepartureTime, AssignedGSEId = pushback?.Id, Notes = "Körük ayrılması ve takozların alınması bekleniyor." }
            };

            _context.TurnaroundTasks.AddRange(defaultTasks);

            if (op.PassengerManifest == null)
            {
                var manifest = new PassengerManifest
                {
                    Id = Guid.NewGuid(),
                    OperationId = op.Id,
                    FlightNumber = op.FlightNumber,
                    Destination = "Frankfurt (FRA)",
                    GateNo = op.GateNo,
                    TotalBooked = 180,
                    BoardedCount = 162,
                    CheckedBaggageCount = 154,
                    LoadedBaggageCount = 130,
                    BoardingStatus = BoardingStatus.Boarding,
                    LuggageMatchComplete = false,
                    LoadsheetApproved = false,
                    ApprovedByRedcap = "Sarah Operations (Redcap)"
                };
                _context.PassengerManifests.Add(manifest);
            }

            await _context.SaveChangesAsync();

            op = await _context.Operations
                .Include(o => o.Aircraft)
                .Include(o => o.TurnaroundTasks)
                    .ThenInclude(t => t.AssignedGSE)
                .Include(o => o.TurnaroundTasks)
                    .ThenInclude(t => t.AssignedUser)
                .Include(o => o.PassengerManifest)
                .FirstAsync(o => o.Id == operationId);
        }

        var tasks = op.TurnaroundTasks.OrderBy(t => t.ScheduledStartTime).Select(t => new TurnaroundTaskDto
        {
            Id = t.Id,
            OperationId = t.OperationId,
            FlightNumber = op.FlightNumber,
            TaskType = t.TaskType,
            Status = t.Status,
            TargetDurationMinutes = t.TargetDurationMinutes,
            ScheduledStartTime = t.ScheduledStartTime,
            ActualStartTime = t.ActualStartTime,
            ActualEndTime = t.ActualEndTime,
            ProgressPercentage = t.ProgressPercentage,
            Notes = t.Notes,
            AssignedUserId = t.AssignedUserId,
            AssignedUserName = t.AssignedUser?.FullName,
            AssignedGSEId = t.AssignedGSEId,
            AssignedGSECode = t.AssignedGSE?.Code
        }).ToList();

        PassengerManifestDto? manifestDto = null;
        if (op.PassengerManifest != null)
        {
            var m = op.PassengerManifest;
            manifestDto = new PassengerManifestDto
            {
                Id = m.Id,
                OperationId = m.OperationId,
                FlightNumber = m.FlightNumber,
                Destination = m.Destination,
                GateNo = m.GateNo,
                TotalBooked = m.TotalBooked,
                BoardedCount = m.BoardedCount,
                CheckedBaggageCount = m.CheckedBaggageCount,
                LoadedBaggageCount = m.LoadedBaggageCount,
                BoardingStatus = m.BoardingStatus,
                LuggageMatchComplete = m.LuggageMatchComplete,
                LoadsheetApproved = m.LoadsheetApproved,
                ApprovedByRedcap = m.ApprovedByRedcap,
                DepartureClearanceGivenAt = m.DepartureClearanceGivenAt
            };
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            Operation = new
            {
                op.Id,
                op.FlightNumber,
                TailNumber = op.Aircraft?.TailNumber,
                AircraftModel = op.Aircraft?.Model,
                op.GateNo,
                op.AssignedRunwayCode,
                op.ArrivalTime,
                op.DepartureTime,
                Status = op.Status.ToString(),
                op.DelayMinutes,
                op.DelayReason
            },
            Tasks = tasks,
            Manifest = manifestDto
        }));
    }

    /// <summary>
    /// Turnaround Görevini Güncelle (Ramp Görevlisi: Kabul Et -> Başlat -> Tamamla)
    /// </summary>
    [HttpPut("turnaround/task/{taskId}")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> UpdateTurnaroundTask(Guid taskId, [FromBody] UpdateTurnaroundTaskDto dto)
    {
        var task = await _context.TurnaroundTasks.FindAsync(taskId);
        if (task == null) return NotFound(ApiResponse<object>.Fail("Görev bulunamadı."));

        task.Status = dto.Status;
        if (dto.ProgressPercentage.HasValue) task.ProgressPercentage = dto.ProgressPercentage.Value;
        if (!string.IsNullOrEmpty(dto.Notes)) task.Notes = dto.Notes;
        if (dto.AssignedUserId.HasValue) task.AssignedUserId = dto.AssignedUserId.Value;
        if (dto.AssignedGSEId.HasValue) task.AssignedGSEId = dto.AssignedGSEId.Value;

        if (dto.Status == TurnaroundTaskStatus.InProgress && task.ActualStartTime == null)
            task.ActualStartTime = DateTime.UtcNow;

        if (dto.Status == TurnaroundTaskStatus.Completed)
        {
            task.ActualEndTime = DateTime.UtcNow;
            task.ProgressPercentage = 100;
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var flightNumber = await _context.Operations
            .Where(o => o.Id == task.OperationId)
            .Select(o => o.FlightNumber)
            .FirstOrDefaultAsync() ?? "";

        await _messageBus.PublishAsync("turnaround.task.updated", new TurnaroundTaskUpdatedEvent
        {
            TaskId = task.Id,
            OperationId = task.OperationId,
            FlightNumber = flightNumber,
            TaskType = task.TaskType.ToString(),
            Status = task.Status.ToString(),
            ProgressPercentage = task.ProgressPercentage,
            Notes = task.Notes,
            ActualStartTime = task.ActualStartTime,
            ActualEndTime = task.ActualEndTime,
            UpdatedAt = DateTime.UtcNow
        });

        return Ok(ApiResponse<object>.Ok(task, "Turnaround görevi güncellendi."));
    }

    /// <summary>
    /// Harekat Memuru (Redcap) Yük ve Denge (Loadsheet) Onayı ve Uçuş İzni (Clearance)
    /// </summary>
    [HttpPost("manifest/{manifestId}/approve-loadsheet")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> ApproveLoadsheet(Guid manifestId, [FromBody] LoadsheetApprovalRequest request)
    {
        var manifest = await _context.PassengerManifests.FindAsync(manifestId);
        if (manifest == null) return NotFound(ApiResponse<object>.Fail("Yolcu manifestosu bulunamadı."));

        bool newStatus = request.Approved ?? true;
        manifest.LoadsheetApproved = newStatus;
        manifest.LuggageMatchComplete = newStatus ? true : manifest.LuggageMatchComplete;
        manifest.ApprovedByRedcap = newStatus ? (request.RedcapName ?? "Sarah Operations (Redcap)") : null;
        manifest.DepartureClearanceGivenAt = newStatus ? DateTime.UtcNow : null;
        manifest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _messageBus.PublishAsync("boarding.progress", new BoardingProgressEvent
        {
            ManifestId = manifest.Id,
            OperationId = manifest.OperationId,
            FlightNumber = manifest.FlightNumber,
            BoardedCount = manifest.BoardedCount,
            TotalPassengers = manifest.TotalBooked,
            LoadedBaggageCount = manifest.LoadedBaggageCount,
            TotalBaggageCount = manifest.CheckedBaggageCount,
            BoardingStatus = manifest.BoardingStatus.ToString(),
            LuggageMatchComplete = manifest.LuggageMatchComplete,
            LoadsheetApproved = manifest.LoadsheetApproved,
            ApprovedByRedcap = manifest.ApprovedByRedcap,
            ActionDescription = newStatus ? "Loadsheet onaylandı & kalkış izni verildi" : "Kalkış izni geri alındı",
            UpdatedAt = DateTime.UtcNow
        });

        if (newStatus)
        {
            await _messageBus.PublishAsync("flight.alert", new FlightAlertEvent
            {
                FlightNumber = manifest.FlightNumber,
                AlertType = "DepartureClearance",
                Message = $"Uçuş {manifest.FlightNumber} için Loadsheet ve kalkış izni (Clearance) Redcap tarafından verildi!",
                Severity = "Info",
                OccurredAt = DateTime.UtcNow
            });
        }

        var message = newStatus 
            ? $"Uçuş {manifest.FlightNumber} için Loadsheet onaylandı ve kalkış izni verildi!" 
            : $"Uçuş {manifest.FlightNumber} için kalkış izni geri alındı (Revoked).";
        return Ok(ApiResponse<object>.Ok(manifest, message));
    }

    /// <summary>
    /// Yolcu Hizmetleri (Gate Agent) Biniş (Boarding) ve Bagaj Sayımı Güncellemesi
    /// </summary>
    [HttpPut("manifest/{manifestId}/boarding")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> UpdateBoarding(Guid manifestId, [FromBody] UpdateBoardingDto dto)
    {
        var manifest = await _context.PassengerManifests.FindAsync(manifestId);
        if (manifest == null) return NotFound(ApiResponse<object>.Fail("Yolcu manifestosu bulunamadı."));

        if (dto.BoardedCount.HasValue) manifest.BoardedCount = dto.BoardedCount.Value;
        if (dto.LoadedBaggageCount.HasValue) manifest.LoadedBaggageCount = dto.LoadedBaggageCount.Value;
        if (dto.BoardingStatus.HasValue) manifest.BoardingStatus = dto.BoardingStatus.Value;
        if (dto.LuggageMatchComplete.HasValue) manifest.LuggageMatchComplete = dto.LuggageMatchComplete.Value;
        manifest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _messageBus.PublishAsync("boarding.progress", new BoardingProgressEvent
        {
            ManifestId = manifest.Id,
            OperationId = manifest.OperationId,
            FlightNumber = manifest.FlightNumber,
            BoardedCount = manifest.BoardedCount,
            TotalPassengers = manifest.TotalBooked,
            LoadedBaggageCount = manifest.LoadedBaggageCount,
            TotalBaggageCount = manifest.CheckedBaggageCount,
            BoardingStatus = manifest.BoardingStatus.ToString(),
            LuggageMatchComplete = manifest.LuggageMatchComplete,
            LoadsheetApproved = manifest.LoadsheetApproved,
            ApprovedByRedcap = manifest.ApprovedByRedcap,
            ActionDescription = "Yolcu/Bagaj durumu güncellendi",
            UpdatedAt = DateTime.UtcNow
        });

        return Ok(ApiResponse<object>.Ok(manifest, "Yolcu biniş ve bagaj durumu güncellendi."));
    }

    /// <summary>
    /// Ramp Görevlisi İş Emirleri Listesi (Tüm uçuşların yer hizmeti görevleri)
    /// </summary>
    [HttpGet("ramp-tasks")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> GetRampTasks([FromQuery] string? filter)
    {
        var list = await _context.TurnaroundTasks
            .Include(t => t.Operation)
                .ThenInclude(o => o.Aircraft)
            .Include(t => t.AssignedGSE)
            .Include(t => t.AssignedUser)
            .OrderBy(t => t.Status == TurnaroundTaskStatus.InProgress ? 0 :
                          t.Status == TurnaroundTaskStatus.Accepted ? 1 :
                          t.Status == TurnaroundTaskStatus.Pending ? 2 : 3)
            .ThenBy(t => t.ScheduledStartTime)
            .Select(t => new RampTaskDto
            {
                Id = t.Id,
                OperationId = t.OperationId,
                FlightNumber = t.Operation != null ? t.Operation.FlightNumber : "N/A",
                GateNo = t.Operation != null ? t.Operation.GateNo : "N/A",
                AssignedRunwayCode = t.Operation != null ? t.Operation.AssignedRunwayCode : null,
                AircraftTailNumber = (t.Operation != null && t.Operation.Aircraft != null) ? t.Operation.Aircraft.TailNumber : "N/A",
                AircraftModel = (t.Operation != null && t.Operation.Aircraft != null) ? t.Operation.Aircraft.Model : "A320/B737",
                TaskType = t.TaskType,
                TaskTitle = t.TaskType.ToString(),
                Status = t.Status,
                TargetDurationMinutes = t.TargetDurationMinutes,
                ScheduledStartTime = t.ScheduledStartTime,
                ActualStartTime = t.ActualStartTime,
                ActualEndTime = t.ActualEndTime,
                ProgressPercentage = t.ProgressPercentage,
                Notes = t.Notes,
                AssignedUserId = t.AssignedUserId,
                AssignedUserName = t.AssignedUser != null ? t.AssignedUser.FullName : null,
                AssignedGSEId = t.AssignedGSEId,
                AssignedGSECode = t.AssignedGSE != null ? t.AssignedGSE.Code : null,
                AssignedGSEName = t.AssignedGSE != null ? t.AssignedGSE.Name : null,
                AssignedGSEStatus = t.AssignedGSE != null ? t.AssignedGSE.Status : null
            })
            .ToListAsync();

        return Ok(ApiResponse<List<RampTaskDto>>.Ok(list));
    }

    /// <summary>
    /// Ramp Görevlisi İş Emri Akış Aksiyonu (Kabul Et -> İşleme Al -> Tamamla)
    /// </summary>
    [HttpPut("ramp-tasks/{taskId}/workflow")]
    [Authorize(Roles = "Admin,OperationsManager,FieldTechnician")]
    public async Task<IActionResult> ExecuteRampWorkflow(Guid taskId, [FromBody] RampWorkflowRequest request)
    {
        var task = await _context.TurnaroundTasks
            .Include(t => t.AssignedGSE)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null) return NotFound(ApiResponse<object>.Fail("Görev bulunamadı."));

        switch (request.Action?.ToUpperInvariant())
        {
            case "ACCEPT":
                task.Status = TurnaroundTaskStatus.Accepted;
                if (request.UserId.HasValue) task.AssignedUserId = request.UserId.Value;
                if (!string.IsNullOrEmpty(request.Notes)) task.Notes = request.Notes;
                break;

            case "START":
                task.Status = TurnaroundTaskStatus.InProgress;
                if (task.ActualStartTime == null) task.ActualStartTime = DateTime.UtcNow;
                if (request.ProgressPercentage.HasValue) task.ProgressPercentage = request.ProgressPercentage.Value;
                else if (task.ProgressPercentage == 0) task.ProgressPercentage = 25;
                if (!string.IsNullOrEmpty(request.Notes)) task.Notes = request.Notes;
                
                // If GSE attached, mark it as Busy
                if (task.AssignedGSE != null)
                {
                    task.AssignedGSE.Status = GSEStatus.Busy;
                }
                break;

            case "COMPLETE":
                task.Status = TurnaroundTaskStatus.Completed;
                task.ActualEndTime = DateTime.UtcNow;
                task.ProgressPercentage = 100;
                if (!string.IsNullOrEmpty(request.Notes)) task.Notes = request.Notes;

                // Free the GSE vehicle back to Idle if it was attached
                if (task.AssignedGSE != null)
                {
                    task.AssignedGSE.Status = GSEStatus.Idle;
                    task.AssignedGSE.CurrentTaskDescription = null;
                }
                break;

            default:
                return BadRequest(ApiResponse<object>.Fail("Geçersiz iş emri aksiyonu. ACCEPT, START veya COMPLETE olmalıdır."));
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var flight = await _context.Operations
            .Where(o => o.Id == task.OperationId)
            .Select(o => new { o.FlightNumber })
            .FirstOrDefaultAsync();

        await _messageBus.PublishAsync("turnaround.task.updated", new TurnaroundTaskUpdatedEvent
        {
            TaskId = task.Id,
            OperationId = task.OperationId,
            FlightNumber = flight?.FlightNumber ?? "",
            TaskType = task.TaskType.ToString(),
            Status = task.Status.ToString(),
            ProgressPercentage = task.ProgressPercentage,
            Notes = task.Notes,
            AssignedGSECode = task.AssignedGSE?.Code,
            ActualStartTime = task.ActualStartTime,
            ActualEndTime = task.ActualEndTime,
            UpdatedAt = DateTime.UtcNow
        });

        if (task.AssignedGSE != null)
        {
            await _messageBus.PublishAsync("gse.status.changed", new GSEStatusChangedEvent
            {
                GSEId = task.AssignedGSE.Id,
                Code = task.AssignedGSE.Code,
                Name = task.AssignedGSE.Name,
                Type = task.AssignedGSE.Type.ToString(),
                Status = task.AssignedGSE.Status.ToString(),
                FuelLevelPercentage = task.AssignedGSE.FuelLevelPercentage,
                ApronZone = task.AssignedGSE.ApronZone,
                CurrentTaskDescription = task.AssignedGSE.CurrentTaskDescription,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            task.Id,
            task.OperationId,
            task.TaskType,
            task.Status,
            task.ProgressPercentage,
            task.ActualStartTime,
            task.ActualEndTime,
            task.Notes,
            task.AssignedUserId,
            task.AssignedGSEId
        }, $"İş emri aksiyonu ({request.Action}) başarıyla tamamlandı."));
    }
}

public class GateOverrideRequest
{
    public Guid OperationId { get; set; }
    public string NewGateNumber { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}

public class LoadsheetApprovalRequest
{
    public string? RedcapName { get; set; }
    public bool? Approved { get; set; }
}

public class UpdateBoardingDto
{
    public int? BoardedCount { get; set; }
    public int? LoadedBaggageCount { get; set; }
    public BoardingStatus? BoardingStatus { get; set; }
    public bool? LuggageMatchComplete { get; set; }
}

public class RampWorkflowRequest
{
    public string Action { get; set; } = string.Empty; // ACCEPT, START, COMPLETE
    public Guid? UserId { get; set; }
    public int? ProgressPercentage { get; set; }
    public string? Notes { get; set; }
    public Guid? GSEId { get; set; }
}

public class RampTaskDto
{
    public Guid Id { get; set; }
    public Guid OperationId { get; set; }
    public string FlightNumber { get; set; } = string.Empty;
    public string? GateNo { get; set; }
    public string? AssignedRunwayCode { get; set; }
    public string AircraftTailNumber { get; set; } = string.Empty;
    public string AircraftModel { get; set; } = string.Empty;
    public TurnaroundTaskType TaskType { get; set; }
    public string TaskTitle { get; set; } = string.Empty;
    public TurnaroundTaskStatus Status { get; set; }
    public int TargetDurationMinutes { get; set; }
    public DateTime? ScheduledStartTime { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }
    public int ProgressPercentage { get; set; }
    public string? Notes { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string? AssignedUserName { get; set; }
    public Guid? AssignedGSEId { get; set; }
    public string? AssignedGSECode { get; set; }
    public string? AssignedGSEName { get; set; }
    public GSEStatus? AssignedGSEStatus { get; set; }
}

