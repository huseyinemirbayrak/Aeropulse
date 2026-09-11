using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using AeroPulse.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AeroPulse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly IAeroPulseDbContext _context;
    private readonly ITenantService _tenantService;

    public TenantsController(IAeroPulseDbContext context, ITenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    // sistemde kayitli aktif firmalari getirir
    [HttpGet]
    public async Task<IActionResult> GetTenants()
    {
        var tenants = await _context.Tenants
            .Where(t => t.IsActive)
            .OrderBy(t => t.Type)
            .ThenBy(t => t.Name)
            .Select(t => new
            {
                t.Id,
                t.Code,
                t.Name,
                Type = t.Type.ToString(),
                t.PrimaryColor,
                t.Description,
                t.ContactEmail
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(tenants));
    }

    // o anki aktif firma bilgisini doner
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentTenant()
    {
        var currentId = _tenantService.CurrentTenantId;
        var currentCode = _tenantService.CurrentTenantCode;
        var isSuperAdmin = _tenantService.IsSuperAdmin;

        object? tenantDetails = null;
        if (currentId.HasValue)
        {
            var tenant = await _context.Tenants.FindAsync(currentId.Value);
            if (tenant != null)
            {
                tenantDetails = new
                {
                    tenant.Id,
                    tenant.Code,
                    tenant.Name,
                    Type = tenant.Type.ToString(),
                    tenant.PrimaryColor
                };
            }
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            TenantId = currentId,
            TenantCode = currentCode,
            IsSuperAdmin = isSuperAdmin,
            Tenant = tenantDetails
        }));
    }
}
