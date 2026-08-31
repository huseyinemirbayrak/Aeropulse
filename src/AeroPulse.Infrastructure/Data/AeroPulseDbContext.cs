using AeroPulse.Application.Services;
using AeroPulse.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.Infrastructure.Data;

public class AeroPulseDbContext : DbContext, IAeroPulseDbContext
{
    public AeroPulseDbContext(DbContextOptions<AeroPulseDbContext> options) : base(options) { }

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

        // Seed SLA Rules
        modelBuilder.Entity<SLARule>().HasData(
            new SLARule { Id = Guid.Parse("a1111111-1111-1111-1111-111111111111"), Priority = Domain.Enums.Priority.Low, MaxResolutionTimeMinutes = 2880 },          // 48 hours
            new SLARule { Id = Guid.Parse("a2222222-2222-2222-2222-222222222222"), Priority = Domain.Enums.Priority.Medium, MaxResolutionTimeMinutes = 1440 },        // 24 hours
            new SLARule { Id = Guid.Parse("a3333333-3333-3333-3333-333333333333"), Priority = Domain.Enums.Priority.High, MaxResolutionTimeMinutes = 480 },            // 8 hours
            new SLARule { Id = Guid.Parse("a4444444-4444-4444-4444-444444444444"), Priority = Domain.Enums.Priority.Critical, MaxResolutionTimeMinutes = 120 }         // 2 hours
        );
    }
}
