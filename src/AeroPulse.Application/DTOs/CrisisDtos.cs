namespace AeroPulse.Application.DTOs;

/// <summary>
/// Manuel veya otomatik kriz tetikleme isteği.
/// </summary>
public class TriggerWindCrisisRequestDto
{
    /// <summary>Havalimanı veya şehir kodu (ör: "LTFM", "IST")</summary>
    public string CityCode { get; set; } = "LTFM";

    /// <summary>Ölçülen veya simüle edilen rüzgâr hızı (km/s). Boş bırakılırsa hava durumu servisinden güncel veri çekilir.</summary>
    public double? WindSpeedKmH { get; set; }

    /// <summary>Kriz tetikleme gerekçesi veya notu</summary>
    public string? Reason { get; set; }
}

/// <summary>
/// Kriz çözüm/normale dönüş isteği.
/// </summary>
public class ResolveWindCrisisRequestDto
{
    /// <summary>Havalimanı veya şehir kodu</summary>
    public string CityCode { get; set; } = "LTFM";

    /// <summary>Güncel rüzgâr hızı (km/s). Boş bırakılırsa hava durumu servisinden güncel veri çekilir.</summary>
    public double? WindSpeedKmH { get; set; }

    /// <summary>Körükleri tekrar Available durumuna çeksin mi? (Varsayılan: true)</summary>
    public bool RestoreJetBridges { get; set; } = true;
}

/// <summary>
/// Kriz tetikleme veya çözme işlem sonucu.
/// </summary>
public class CrisisOperationResultDto
{
    public bool IsCrisisActive { get; set; }
    public string CityCode { get; set; } = string.Empty;
    public double WindSpeedKmH { get; set; }
    public double ThresholdKmH { get; set; }
    public int AffectedJetBridgesCount { get; set; }
    public int NotifiedUsersCount { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Güncel kriz durumu bilgisi.
/// </summary>
public class CrisisStatusDto
{
    public bool IsCrisisActive { get; set; }
    public string? ActiveCrisisType { get; set; }
    public string CityCode { get; set; } = "LTFM";
    public double CurrentWindSpeedKmH { get; set; }
    public double ThresholdKmH { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int DisabledJetBridgesCount { get; set; }
    public string? LastActionMessage { get; set; }
    public DateTime LastCheckedAt { get; set; } = DateTime.UtcNow;
}
