using AeroPulse.Application.DTOs;

namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Havalimanı operasyonları için hava durumu verisi sağlayan servis arayüzü.
/// </summary>
public interface IWeatherService
{
    /// <summary>
    /// Belirtilen şehir kodu (ICAO/IATA) için güncel hava durumu verisini getirir.
    /// </summary>
    /// <param name="cityCode">Havalimanı veya şehir kodu (ör: "IST", "LTFM", "SAW")</param>
    /// <returns>Güncel hava durumu verisi</returns>
    Task<WeatherData> GetCurrentWeatherAsync(string cityCode);

    /// <summary>
    /// Belirtilen şehir kodu için hava durumu tahmin verisini getirir.
    /// </summary>
    /// <param name="cityCode">Havalimanı veya şehir kodu</param>
    /// <param name="hours">Kaç saatlik tahmin isteniyor (varsayılan: 24)</param>
    /// <returns>Saatlik tahmin listesi</returns>
    Task<List<WeatherForecastItem>> GetForecastAsync(string cityCode, int hours = 24);
}
