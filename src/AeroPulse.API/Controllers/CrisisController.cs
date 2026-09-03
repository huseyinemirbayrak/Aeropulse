using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AeroPulse.API.Controllers;

/// <summary>
/// Modül 7: Kriz ve Acil Durum Yönetimi API Controller'ı.
/// 
/// Endpoint'ler:
///   GET    /api/crisis/status               — Aktif kriz durumunu döner
///   GET    /api/crisis/weather              — Güncel hava durumu verisini çeker
///   POST   /api/crisis/wind/trigger         — Rüzgâr krizini tetikler (Simülasyon veya Acil Durum)
///   POST   /api/crisis/wind/resolve         — Rüzgâr krizini sonlandırır ve sistemi normale döndürür
/// </summary>
[ApiController]
[Route("api/crisis")]
[Authorize]
public class CrisisController : ControllerBase
{
    private readonly IWeatherCrisisService _crisisService;
    private readonly IWeatherService _weatherService;

    public CrisisController(
        IWeatherCrisisService crisisService,
        IWeatherService weatherService)
    {
        _crisisService = crisisService;
        _weatherService = weatherService;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var result = await _crisisService.GetCrisisStatusAsync();
        return Ok(result);
    }

    [HttpGet("weather")]
    public async Task<IActionResult> GetWeather([FromQuery] string cityCode = "LTFM")
    {
        try
        {
            var weather = await _weatherService.GetCurrentWeatherAsync(cityCode);
            return Ok(ApiResponse<WeatherData>.Ok(weather));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<WeatherData>.Fail($"Hava durumu alınamadı: {ex.Message}"));
        }
    }

    /// <summary>
    /// Rüzgâr / Windshear krizini manuel olarak tetikler veya simüle eder.
    /// Körükler 'UnderMaintenance' moduna çekilir, acil bildirimler gönderilir ve RabbitMQ'ya mesaj iletilir.
    /// Sadece Admin ve OperationsManager rolleri tetikleyebilir.
    /// </summary>
    [HttpPost("wind/trigger")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> TriggerWindCrisis([FromBody] TriggerWindCrisisRequestDto request)
    {
        var cityCode = string.IsNullOrWhiteSpace(request.CityCode) ? "LTFM" : request.CityCode;
        double windSpeed;

        if (request.WindSpeedKmH.HasValue)
        {
            windSpeed = request.WindSpeedKmH.Value;
        }
        else
        {
            var weather = await _weatherService.GetCurrentWeatherAsync(cityCode);
            windSpeed = weather.WindSpeed * 3.6;
        }

        var result = await _crisisService.TriggerWindCrisisAsync(
            cityCode,
            windSpeed,
            80.0,
            request.Reason ?? "Manuel acil durum veya simülasyon tetiklendi.");

        return Ok(result);
    }

    /// <summary>
    /// Aktif rüzgâr krizini sonlandırır, körükleri tekrar 'Available' durumuna alır ve normale dönüş bildirimi yayınlar.
    /// Sadece Admin ve OperationsManager rolleri çağırabilir.
    /// </summary>
    [HttpPost("wind/resolve")]
    [Authorize(Roles = "Admin,OperationsManager")]
    public async Task<IActionResult> ResolveWindCrisis([FromBody] ResolveWindCrisisRequestDto request)
    {
        var cityCode = string.IsNullOrWhiteSpace(request.CityCode) ? "LTFM" : request.CityCode;
        double windSpeed;

        if (request.WindSpeedKmH.HasValue)
        {
            windSpeed = request.WindSpeedKmH.Value;
        }
        else
        {
            var weather = await _weatherService.GetCurrentWeatherAsync(cityCode);
            windSpeed = weather.WindSpeed * 3.6;
        }

        var result = await _crisisService.ResolveWindCrisisAsync(
            cityCode,
            windSpeed,
            request.RestoreJetBridges);

        return Ok(result);
    }
}
