namespace AeroPulse.Domain.Entities;

public enum TenantType
{
    Airline = 0,            // Havayolu Şirketi (THY, Pegasus, SunExpress vb.)
    GroundHandler = 1,      // Yer Hizmeti Taşeronu (TGS, Çelebi, Havaş vb.)
    AirportAuthority = 2    // Havalimanı Otoritesi & OCC (İGA, DHMİ vb.)
}

/// <summary>
/// AeroPulse sistemindeki bağımsız bir havayolu, yer hizmeti veya havalimanı otoritesi kiracısı.
/// </summary>
public class Tenant : BaseEntity
{
    public string Code { get; set; } = string.Empty; // ör: "THY", "PGS", "TGS", "CLB", "IGA"
    public string Name { get; set; } = string.Empty; // ör: "Türk Hava Yolları", "Pegasus Airlines"
    public TenantType Type { get; set; } = TenantType.Airline;
    public string PrimaryColor { get; set; } = "#3b82f6"; // Arayüz marka rengi
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ContactEmail { get; set; }
    public string? Description { get; set; }
}
