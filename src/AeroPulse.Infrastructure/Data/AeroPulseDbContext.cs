using AeroPulse.Application.Interfaces;
using AeroPulse.Application.Services;
using AeroPulse.Domain.Common;
using AeroPulse.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Infrastructure.Data;

public class AeroPulseDbContext : DbContext, IAeroPulseDbContext
{
    private readonly ITenantService? _tenantService;

    public AeroPulseDbContext(DbContextOptions<AeroPulseDbContext> options, ITenantService? tenantService = null) : base(options)
    {
        _tenantService = tenantService;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Aircraft> Aircraft => Set<Aircraft>();
    public DbSet<Part> Parts => Set<Part>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<FaultReport> FaultReports => Set<FaultReport>();
    public DbSet<Operation> Operations => Set<Operation>();
    public DbSet<SLARule> SLARules => Set<SLARule>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<JetBridge> JetBridges => Set<JetBridge>();
    public DbSet<JetBridgeAssignment> JetBridgeAssignments => Set<JetBridgeAssignment>();
    public DbSet<Runway> Runways => Set<Runway>();
    public DbSet<Gate> Gates => Set<Gate>();
    public DbSet<TurnaroundTask> TurnaroundTasks => Set<TurnaroundTask>();
    public DbSet<GroundSupportEquipment> GroundSupportEquipments => Set<GroundSupportEquipment>();
    public DbSet<PassengerManifest> PassengerManifests => Set<PassengerManifest>();
    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ===== USER =====
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).HasConversion<int>();
        });

        // ===== AIRCRAFT =====
        modelBuilder.Entity<Aircraft>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TailNumber).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.TailNumber).IsUnique();
            entity.Property(e => e.Model).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Operator).HasMaxLength(200);
            entity.Property(e => e.StatusCode).HasConversion<int>();
        });

        // ===== PART =====
        modelBuilder.Entity<Part>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PartName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.PartNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Location).HasMaxLength(200);
            entity.Property(e => e.Manufacturer).HasMaxLength(200);
            entity.HasIndex(e => e.UsedHours);
            entity.HasOne(e => e.Aircraft)
                .WithMany(a => a.Parts)
                .HasForeignKey(e => e.AircraftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== MAINTENANCE RECORD =====
        modelBuilder.Entity<MaintenanceRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkPerformed).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.CertificateNo).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.MaintenanceType).HasConversion<int>();
            entity.HasOne(e => e.Aircraft)
                .WithMany(a => a.MaintenanceRecords)
                .HasForeignKey(e => e.AircraftId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Part)
                .WithMany(p => p.MaintenanceRecords)
                .HasForeignKey(e => e.PartId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Engineer)
                .WithMany(u => u.MaintenanceRecords)
                .HasForeignKey(e => e.EngineerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== FAULT REPORT =====
        modelBuilder.Entity<FaultReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.ResolutionNotes).HasMaxLength(2000);
            entity.Property(e => e.Priority).HasConversion<int>();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Aircraft)
                .WithMany(a => a.FaultReports)
                .HasForeignKey(e => e.AircraftId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ReportedByTechnician)
                .WithMany(u => u.ReportedFaults)
                .HasForeignKey(e => e.ReportedByTechnicianId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.AssignedEngineer)
                .WithMany(u => u.AssignedFaults)
                .HasForeignKey(e => e.AssignedEngineerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== OPERATION =====
        modelBuilder.Entity<Operation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GateNo).HasMaxLength(20);
            entity.Property(e => e.DelayReason).HasMaxLength(500);
            entity.Property(e => e.FlightNumber).HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasIndex(e => e.ArrivalTime);
            entity.HasOne(e => e.Aircraft)
                .WithMany(a => a.Operations)
                .HasForeignKey(e => e.AircraftId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.OperationsManager)
                .WithMany(u => u.ManagedOperations)
                .HasForeignKey(e => e.OperationsManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== SLA RULE =====
        modelBuilder.Entity<SLARule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Priority).HasConversion<int>();
            entity.HasIndex(e => e.Priority).IsUnique();
        });

        // ===== NOTIFICATION =====
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.NotificationType).HasConversion<int>();
            entity.HasOne(e => e.FaultReport)
                .WithMany(f => f.Notifications)
                .HasForeignKey(e => e.FaultReportId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.RecipientUser)
                .WithMany(u => u.Notifications)
                .HasForeignKey(e => e.RecipientUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== JET BRIDGE =====
        modelBuilder.Entity<JetBridge>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BridgeNo).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TerminalNo).IsRequired().HasMaxLength(20);
            entity.Property(e => e.StatusCode).HasConversion<int>();
            entity.HasIndex(e => new { e.TerminalNo, e.BridgeNo }).IsUnique();
        });

        // ===== JET BRIDGE ASSIGNMENT =====
        modelBuilder.Entity<JetBridgeAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasIndex(e => e.EstimatedArrivalTime);
            entity.HasOne(e => e.JetBridge)
                .WithMany(j => j.Assignments)
                .HasForeignKey(e => e.JetBridgeId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Aircraft)
                .WithMany(a => a.JetBridgeAssignments)
                .HasForeignKey(e => e.AircraftId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Operation)
                .WithMany(o => o.JetBridgeAssignments)
                .HasForeignKey(e => e.OperationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== RUNWAY =====
        modelBuilder.Entity<Runway>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RunwayCode).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.RunwayCode).IsUnique();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.SurfaceType).HasMaxLength(50);
            entity.Property(e => e.CurrentFlightNumber).HasMaxLength(20);
        });

        // ===== GATE =====
        modelBuilder.Entity<Gate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GateNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TerminalCode).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => new { e.TerminalCode, e.GateNumber }).IsUnique();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.CurrentFlightNumber).HasMaxLength(20);
            entity.HasOne(e => e.CurrentAircraft)
                .WithMany()
                .HasForeignKey(e => e.CurrentAircraftId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== GROUND SUPPORT EQUIPMENT (GSE) =====
        modelBuilder.Entity<GroundSupportEquipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(30);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.ApronZone).HasMaxLength(100);
            entity.Property(e => e.OperatorName).HasMaxLength(100);
            entity.Property(e => e.CurrentTaskDescription).HasMaxLength(200);
        });

        // ===== TURNAROUND TASK =====
        modelBuilder.Entity<TurnaroundTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TaskType).HasConversion<int>();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.HasOne(e => e.Operation)
                .WithMany(o => o.TurnaroundTasks)
                .HasForeignKey(e => e.OperationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.AssignedUser)
                .WithMany()
                .HasForeignKey(e => e.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.AssignedGSE)
                .WithMany(g => g.AssignedTasks)
                .HasForeignKey(e => e.AssignedGSEId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== PASSENGER MANIFEST =====
        modelBuilder.Entity<PassengerManifest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FlightNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Destination).HasMaxLength(100);
            entity.Property(e => e.GateNo).HasMaxLength(20);
            entity.Property(e => e.BoardingStatus).HasConversion<int>();
            entity.Property(e => e.ApprovedByRedcap).HasMaxLength(100);
            entity.HasOne(e => e.Operation)
                .WithOne(o => o.PassengerManifest)
                .HasForeignKey<PassengerManifest>(e => e.OperationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed SLA Rules
        modelBuilder.Entity<SLARule>().HasData(
            new SLARule { Id = Guid.Parse("a1111111-1111-1111-1111-111111111111"), Priority = Domain.Enums.Priority.Low, MaxResolutionTimeMinutes = 2880 },          // 48 hours
            new SLARule { Id = Guid.Parse("a2222222-2222-2222-2222-222222222222"), Priority = Domain.Enums.Priority.Medium, MaxResolutionTimeMinutes = 1440 },        // 24 hours
            new SLARule { Id = Guid.Parse("a3333333-3333-3333-3333-333333333333"), Priority = Domain.Enums.Priority.High, MaxResolutionTimeMinutes = 480 },            // 8 hours
            new SLARule { Id = Guid.Parse("a4444444-4444-4444-4444-444444444444"), Priority = Domain.Enums.Priority.Critical, MaxResolutionTimeMinutes = 120 }         // 2 hours
        );

        // ===== TENANT =====
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Type).HasConversion<int>();
            entity.Property(e => e.PrimaryColor).HasMaxLength(30);
        });

        // ===== MULTI-TENANCY GLOBAL QUERY FILTERS =====
        // SuperAdmin (veya kiracı seçilmemişse) tüm kiracıları cross-tenant izleyebilir;
        // Belirli bir kiracı (THY, Pegasus, TGS vb.) seçildiğinde sadece o kiracının verileri gelir.
        modelBuilder.Entity<Operation>()
            .HasQueryFilter(e => _tenantService == null || _tenantService.IsSuperAdmin || e.TenantId == null || e.TenantId == _tenantService.CurrentTenantId);

        modelBuilder.Entity<Aircraft>()
            .HasQueryFilter(e => _tenantService == null || _tenantService.IsSuperAdmin || e.TenantId == null || e.TenantId == _tenantService.CurrentTenantId);

        modelBuilder.Entity<GroundSupportEquipment>()
            .HasQueryFilter(e => _tenantService == null || _tenantService.IsSuperAdmin || e.TenantId == null || e.TenantId == _tenantService.CurrentTenantId || (e.Tenant != null && e.Tenant.Type == Domain.Entities.TenantType.GroundHandler));

        modelBuilder.Entity<TurnaroundTask>()
            .HasQueryFilter(e => _tenantService == null || _tenantService.IsSuperAdmin || e.TenantId == null || e.TenantId == _tenantService.CurrentTenantId || (e.Operation != null && e.Operation.TenantId == _tenantService.CurrentTenantId));

        modelBuilder.Entity<FaultReport>()
            .HasQueryFilter(e => _tenantService == null || _tenantService.IsSuperAdmin || e.TenantId == null || e.TenantId == _tenantService.CurrentTenantId || (e.Aircraft != null && e.Aircraft.TenantId == _tenantService.CurrentTenantId));
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantId();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyTenantId();
        return base.SaveChanges();
    }

    private void ApplyTenantId()
    {
        if (_tenantService?.CurrentTenantId == null) return;

        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.TenantId == null)
            {
                entry.Entity.TenantId = _tenantService.CurrentTenantId;
            }
        }
    }
}
