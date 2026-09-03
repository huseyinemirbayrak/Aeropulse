using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Hava durumu kriz yönetimi (Rüzgâr, Windshear, Fırtına vb.) için servis arayüzü.
/// </summary>
public interface IWeatherCrisisService
{
    /// <summary>
    /// Rüzgâr krizini tetikler:
    /// - Tüm körükleri güvenlik amacıyla "UnderMaintenance" statüsüne alır.
    /// - Operasyon Yöneticisi ve Admin rollerine kritik seviyeli acil durum bildirimi gönderir.
    /// - Mesaj kuyruğuna (RabbitMQ) kriz olayını yayınlar.
    /// - Spam koruması: Kriz zaten aktifse tekrar bildirim atmaz.
    /// </summary>
    Task<ApiResponse<CrisisOperationResultDto>> TriggerWindCrisisAsync(
        string cityCode,
        double windSpeedKmH,
        double thresholdKmH = 80.0,
        string? reason = null);

    /// <summary>
    /// Rüzgâr krizini sonlandırır:
    /// - Kriz aktifse sonlandırır ve normale dönüş bildirimi gönderir.
    /// - İsteğe bağlı olarak körükleri yeniden Available durumuna getirir.
    /// - Mesaj kuyruğuna normale dönüş olayını yayınlar.
    /// </summary>
    Task<ApiResponse<CrisisOperationResultDto>> ResolveWindCrisisAsync(
        string cityCode,
        double windSpeedKmH,
        bool restoreJetBridges = true);

    /// <summary>
    /// Sistemin güncel kriz durumunu döner.
    /// </summary>
    Task<ApiResponse<CrisisStatusDto>> GetCrisisStatusAsync();
}
