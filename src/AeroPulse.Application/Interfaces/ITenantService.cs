namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Çok kiracılı (Multi-Tenant) mimaride gelen isteğin ait olduğu kiracıyı çözümleyen servis arayüzü.
/// </summary>
public interface ITenantService
{
    /// <summary>
    /// Aktif kiracının benzersiz kimliği (SuperAdmin / İGA için null olabilir)
    /// </summary>
    Guid? CurrentTenantId { get; }

    /// <summary>
    /// Aktif kiracının kodu (örn: "THY", "PGS", "TGS", "CLB", "IGA")
    /// </summary>
    string? CurrentTenantCode { get; }

    /// <summary>
    /// İsteğin havalimanı otoritesi veya süper yönetici tarafından yapılıp yapılmadığı (tüm kiracıları cross-tenant izleme yetkisi)
    /// </summary>
    bool IsSuperAdmin { get; }

    /// <summary>
    /// Kiracı bağlamını manuel olarak ayarlamak için kullanılır (örnek: arka plan işleri veya testler)
    /// </summary>
    void SetTenant(Guid? tenantId, string? code, bool isSuperAdmin = false);
}
