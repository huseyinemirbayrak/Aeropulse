using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Infrastructure.BackgroundServices;

/// <summary>
/// Havalimanı rüzgâr hızını ve hava durumunu periyodik olarak izleyen arka plan işçisi (Background Worker).
/// Her döngüde IWeatherService üzerinden hava durumu bilgisini çeker.
/// Rüzgâr hızı belirlenen emniyet limitini (örn: 80 km/s - Windshear) aştığında
/// IWeatherCrisisService üzerinden kriz senaryosunu tetikler.
/// </summary>
public class WeatherMonitorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WeatherMonitorWorker> _logger;

    public WeatherMonitorWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<WeatherMonitorWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 WeatherMonitorWorker başlatıldı. Hava durumu izleme devrede.");

        // Yapılandırma ayarlarını oku (varsayılan: 5 dakika)
        var intervalMinutes = _configuration.GetValue<int>("Weather:CheckIntervalMinutes", 5);
        var intervalSeconds = _configuration.GetValue<int>("Weather:CheckIntervalSeconds", 0);
        var checkInterval = intervalSeconds > 0
            ? TimeSpan.FromSeconds(intervalSeconds)
            : TimeSpan.FromMinutes(intervalMinutes > 0 ? intervalMinutes : 5);

        var cityCode = _configuration.GetValue<string>("Weather:CityCode", "LTFM") ?? "LTFM";
        var thresholdKmH = _configuration.GetValue<double>("Weather:WindSpeedThresholdKmH", 80.0);

        _logger.LogInformation(
            "WeatherMonitorWorker Ayarları -> Lokasyon: {CityCode}, Periyot: {Interval}, Rüzgâr Eşiği: {Threshold} km/s",
            cityCode, checkInterval, thresholdKmH);

        // Başlangıçta uygulamanın tamamen ayağa kalkması için kısa bir bekleme
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await MonitorWeatherAsync(cityCode, thresholdKmH, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WeatherMonitorWorker döngüsünde beklenmeyen bir hata meydana geldi.");
            }

            try
            {
                await Task.Delay(checkInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("🛑 WeatherMonitorWorker durduruldu.");
    }

    private async Task MonitorWeatherAsync(string cityCode, double thresholdKmH, CancellationToken cancellationToken)
    {
        // BackgroundService Singleton olduğundan Scoped servisleri IServiceScopeFactory ile çözüyoruz
        using var scope = _scopeFactory.CreateScope();
        var weatherService = scope.ServiceProvider.GetRequiredService<IWeatherService>();
        var crisisService = scope.ServiceProvider.GetRequiredService<IWeatherCrisisService>();

        _logger.LogInformation("🔍 Hava durumu kontrol ediliyor: {CityCode}", cityCode);

        var weather = await weatherService.GetCurrentWeatherAsync(cityCode);
        if (weather == null)
        {
            _logger.LogWarning("Hava durumu servisi veri döndürmedi: {CityCode}", cityCode);
            return;
        }

        // OpenWeather m/s biriminde döner; km/s çevrimi: m/s * 3.6
        var windSpeedKmH = weather.WindSpeed * 3.6;
        var windGustKmH = (weather.WindGust ?? 0) * 3.6;
        var effectiveWindSpeed = Math.Max(windSpeedKmH, windGustKmH);

        _logger.LogInformation(
            "🌬️ {City} ({CityCode}) -> Rüzgâr: {Speed:F1} km/s (Esinti: {Gust:F1} km/s) | Sıcaklık: {Temp}°C | Durum: {Desc}",
            weather.CityName, weather.CityCode, windSpeedKmH, windGustKmH, weather.Temperature, weather.Description);

        // Eşik kontrolü ve Kriz Yönetim Servisi çağrısı
        if (effectiveWindSpeed >= thresholdKmH)
        {
            var result = await crisisService.TriggerWindCrisisAsync(
                cityCode,
                effectiveWindSpeed,
                thresholdKmH,
                $"Otomatik Hava Durumu İzleyici uyarısı: {weather.Description}, Esinti: {windGustKmH:F1} km/s");

            if (result.Success && result.Data?.NotifiedUsersCount > 0)
            {
                _logger.LogCritical("🚨 Kriz servisi başarıyla tetiklendi: {Message}", result.Data.Message);
            }
        }
        else
        {
            // Rüzgâr güvenli seviyedeyse ve daha önce kriz açılmışsa servise normale dön çağrısı yap
            var statusResult = await crisisService.GetCrisisStatusAsync();
            if (statusResult.Data?.IsCrisisActive == true)
            {
                var resolveResult = await crisisService.ResolveWindCrisisAsync(cityCode, effectiveWindSpeed);
                if (resolveResult.Success)
                {
                    _logger.LogInformation("✅ Kriz çözümü tamamlandı: {Message}", resolveResult.Data?.Message);
                }
            }
        }
    }
}
