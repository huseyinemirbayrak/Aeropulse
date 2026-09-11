namespace AeroPulse.Domain.Common;

/// <summary>
/// Çok kiracılı (Multi-Tenant) veri yalıtımı uygulanan varlıklar için ortak arayüz.
/// </summary>
public interface ITenantEntity
{
    Guid? TenantId { get; set; }
}
