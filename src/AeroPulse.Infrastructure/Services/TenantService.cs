using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace AeroPulse.Infrastructure.Services;

public class TenantService : ITenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    private Guid? _manualTenantId;
    private string? _manualTenantCode;
    private bool? _manualIsSuperAdmin;

    public static readonly Dictionary<string, Guid> WellKnownTenants = new(StringComparer.OrdinalIgnoreCase)
    {
        ["THY"] = Guid.Parse("a0000000-0000-0000-0000-000000000001"),
        ["PGS"] = Guid.Parse("a0000000-0000-0000-0000-000000000002"),
        ["SXS"] = Guid.Parse("a0000000-0000-0000-0000-000000000006"),
        ["AJT"] = Guid.Parse("a0000000-0000-0000-0000-000000000007"),
        ["DLH"] = Guid.Parse("a0000000-0000-0000-0000-000000000008"),
        ["TGS"] = Guid.Parse("a0000000-0000-0000-0000-000000000003"),
        ["CLB"] = Guid.Parse("a0000000-0000-0000-0000-000000000004"),
        ["IGA"] = Guid.Parse("a0000000-0000-0000-0000-000000000005")
    };

    public TenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? CurrentTenantId
    {
        get
        {
            if (_manualTenantId.HasValue) return _manualTenantId;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return null;

            // 1. X-Tenant-ID Header Kontrolü
            if (httpContext.Request.Headers.TryGetValue("X-Tenant-ID", out var tenantHeader))
            {
                var val = tenantHeader.ToString().Trim();
                if (string.Equals(val, "ALL", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(val, "IGA", StringComparison.OrdinalIgnoreCase))
                {
                    return null; // Cross-tenant (SuperAdmin view)
                }

                if (Guid.TryParse(val, out var parsedGuid))
                {
                    return parsedGuid;
                }

                if (WellKnownTenants.TryGetValue(val, out var mappedGuid))
                {
                    return mappedGuid;
                }
            }

            // 2. JWT Claims Kontrolü
            var tenantClaim = httpContext.User?.FindFirst("tenant_id")?.Value;
            if (!string.IsNullOrEmpty(tenantClaim) && Guid.TryParse(tenantClaim, out var claimGuid))
            {
                return claimGuid;
            }

            return null;
        }
    }

    public string? CurrentTenantCode
    {
        get
        {
            if (!string.IsNullOrEmpty(_manualTenantCode)) return _manualTenantCode;

            var id = CurrentTenantId;
            if (!id.HasValue) return "ALL";

            foreach (var kvp in WellKnownTenants)
            {
                if (kvp.Value == id.Value) return kvp.Key;
            }

            return id.Value.ToString();
        }
    }

    public bool IsSuperAdmin
    {
        get
        {
            if (_manualIsSuperAdmin.HasValue) return _manualIsSuperAdmin.Value;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return true;

            // Header'da ALL veya IGA belirtilmişse
            if (httpContext.Request.Headers.TryGetValue("X-Tenant-ID", out var tenantHeader))
            {
                var val = tenantHeader.ToString().Trim();
                if (string.Equals(val, "ALL", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(val, "IGA", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            // Kullanıcı Admin rolündeyse ve belirli bir kiracı zorlanmamışsa
            var role = httpContext.User?.FindFirst(ClaimTypes.Role)?.Value;
            if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) && !CurrentTenantId.HasValue)
            {
                return true;
            }

            // Eğer kiracı kimliği seçilmemişse varsayılan olarak SuperAdmin modundadır (tüm operasyonları izler)
            return !CurrentTenantId.HasValue;
        }
    }

    public void SetTenant(Guid? tenantId, string? code, bool isSuperAdmin = false)
    {
        _manualTenantId = tenantId;
        _manualTenantCode = code;
        _manualIsSuperAdmin = isSuperAdmin;
    }
}
