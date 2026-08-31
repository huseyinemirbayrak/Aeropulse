using AeroPulse.Application.DTOs;
using AeroPulse.Application.Services;
using AeroPulse.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.API.Controllers;

/// <summary>
/// Grafana ve izleme araçları için metrik endpoint'i.
/// 
/// İki format desteklenir:
///   GET /api/metrics        — JSON format (Grafana JSON datasource)
///   GET /api/metrics/prometheus — Prometheus exposition format (scraping)
/// 
/// Grafana bu endpoint'i belirli aralıklarla çağırır (scraping).
/// Metrikler DB'den anlık olarak okunur.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous] // Grafana'nın kimlik doğrulaması olmadan erişebilmesi için
public class MetricsController : ControllerBase
{
    private readonly IAeroPulseDbContext _context;

    public MetricsController(IAeroPulseDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// JSON format metrikler — Grafana Simple JSON Datasource veya özel entegrasyon için.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMetrics()
    {
        var metrics = await BuildMetricsAsync();
        return Ok(metrics);
    }

    /// <summary>
    /// Prometheus exposition format.
    /// Grafana'nın Prometheus datasource'u bu format'ı scrape eder.
    /// 
    /// Format: # HELP ... \n # TYPE ... \n metric_name value timestamp
    /// </summary>
    [HttpGet("prometheus")]
    [Produces("text/plain")]
    public async Task<IActionResult> GetPrometheus()
    {
        var m = await BuildMetricsAsync();
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var sb = new System.Text.StringBuilder();

        sb.AppendLine("# HELP aeropulse_open_faults_total Açık arıza talep sayısı");
        sb.AppendLine("# TYPE aeropulse_open_faults_total gauge");
        sb.AppendLine($"aeropulse_open_faults_total {m.TotalOpenFaults} {timestamp}");
        sb.AppendLine();

        sb.AppendLine("# HELP aeropulse_sla_breaches_total SLA ihlali sayısı (açık arızalar)");
        sb.AppendLine("# TYPE aeropulse_sla_breaches_total gauge");
        sb.AppendLine($"aeropulse_sla_breaches_total {m.TotalSLABreaches} {timestamp}");
        sb.AppendLine();

        sb.AppendLine("# HELP aeropulse_avg_fault_resolution_minutes Ortalama arıza çözüm süresi (dakika)");
        sb.AppendLine("# TYPE aeropulse_avg_fault_resolution_minutes gauge");
        sb.AppendLine($"aeropulse_avg_fault_resolution_minutes {m.AvgFaultResolutionMinutes:F2} {timestamp}");
        sb.AppendLine();

        sb.AppendLine("# HELP aeropulse_active_operations Aktif operasyon sayısı");
        sb.AppendLine("# TYPE aeropulse_active_operations gauge");
        sb.AppendLine($"aeropulse_active_operations {m.ActiveOperations} {timestamp}");
        sb.AppendLine();

        sb.AppendLine("# HELP aeropulse_jet_bridges_total Toplam körük sayısı");
        sb.AppendLine("# TYPE aeropulse_jet_bridges_total gauge");
        sb.AppendLine($"aeropulse_jet_bridges_total {m.TotalJetBridges} {timestamp}");
        sb.AppendLine();

        sb.AppendLine("# HELP aeropulse_jet_bridges_available Boş körük sayısı");
        sb.AppendLine("# TYPE aeropulse_jet_bridges_available gauge");
        sb.AppendLine($"aeropulse_jet_bridges_available {m.AvailableJetBridges} {timestamp}");
        sb.AppendLine();

        sb.AppendLine("# HELP aeropulse_jet_bridges_connected Bağlı körük sayısı");
        sb.AppendLine("# TYPE aeropulse_jet_bridges_connected gauge");
        sb.AppendLine($"aeropulse_jet_bridges_connected {m.ConnectedJetBridges} {timestamp}");

        return Content(sb.ToString(), "text/plain; version=0.0.4; charset=utf-8");
    }

    private async Task<MetricsDto> BuildMetricsAsync()
    {
        // Arıza metrikleri
        var totalOpenFaults = await _context.FaultReports
            .CountAsync(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview);

        // SLA ihlalleri: SLA süresi geçmiş açık arızalar
        var slaRules = await _context.SLARules.ToListAsync();
        var activeFaults = await _context.FaultReports
            .Where(f => f.Status == FaultStatus.Open || f.Status == FaultStatus.UnderReview)
            .ToListAsync();

        var slaBreaches = activeFaults.Count(f =>
        {
            var rule = slaRules.FirstOrDefault(r => r.Priority == f.Priority);
            if (rule == null) return false;
            var elapsed = (DateTime.UtcNow - f.OpenDate).TotalMinutes;
            return elapsed > rule.MaxResolutionTimeMinutes;
        });

        // Ortalama çözüm süresi (çözülmüş arızalar)
        var resolvedFaults = await _context.FaultReports
            .Where(f => f.Status == FaultStatus.Resolved && f.CloseDate.HasValue)
            .Select(f => new { f.OpenDate, CloseDate = f.CloseDate!.Value })
            .ToListAsync();

        var avgResolutionMinutes = resolvedFaults.Any()
            ? resolvedFaults.Average(f => (f.CloseDate - f.OpenDate).TotalMinutes)
            : 0;

        // Operasyon metrikleri
        var activeOperations = await _context.Operations
            .CountAsync(o => o.Status == OperationStatus.InProgress || o.Status == OperationStatus.Scheduled);

        // Körük metrikleri
        var bridges = await _context.JetBridges.ToListAsync();
        var totalBridges = bridges.Count;
        var availableBridges = bridges.Count(b => b.StatusCode == JetBridgeStatus.Available);
        var connectedBridges = bridges.Count(b => b.StatusCode == JetBridgeStatus.Connected);

        return new MetricsDto
        {
            TotalOpenFaults = totalOpenFaults,
            TotalSLABreaches = slaBreaches,
            AvgFaultResolutionMinutes = Math.Round(avgResolutionMinutes, 2),
            ActiveOperations = activeOperations,
            TotalJetBridges = totalBridges,
            AvailableJetBridges = availableBridges,
            ConnectedJetBridges = connectedBridges,
            GeneratedAt = DateTime.UtcNow
        };
    }
}
