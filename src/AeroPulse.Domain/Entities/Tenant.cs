namespace AeroPulse.Domain.Entities;

public enum TenantType
{
    Airline = 0,
    GroundHandler = 1,
    AirportAuthority = 2
}

public class Tenant : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TenantType Type { get; set; } = TenantType.Airline;
    public string PrimaryColor { get; set; } = "#3b82f6";
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ContactEmail { get; set; }
    public string? Description { get; set; }
}
