using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Infrastructure.BackgroundServices;

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
        _logger.LogInformation("WeatherMonitorWorker started. Meteorological surveillance active.");

        var intervalMinutes = _configuration.GetValue<int>("Weather:CheckIntervalMinutes", 5);
        var intervalSeconds = _configuration.GetValue<int>("Weather:CheckIntervalSeconds", 0);
        var checkInterval = intervalSeconds > 0
            ? TimeSpan.FromSeconds(intervalSeconds)
            : TimeSpan.FromMinutes(intervalMinutes > 0 ? intervalMinutes : 5);

        var cityCode = _configuration.GetValue<string>("Weather:CityCode", "LTFM") ?? "LTFM";
        var thresholdKmH = _configuration.GetValue<double>("Weather:WindSpeedThresholdKmH", 80.0);

        _logger.LogInformation(
            "WeatherMonitorWorker configuration -> Hub: {CityCode}, Interval: {Interval}, Windshear Threshold: {Threshold} km/h",
            cityCode, checkInterval, thresholdKmH);

        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("WeatherMonitorWorker stopping; initialization aborted.");
            return;
        }

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
                _logger.LogError(ex, "Unexpected error in WeatherMonitorWorker execution cycle.");
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

        _logger.LogInformation("WeatherMonitorWorker stopped.");
    }

    private async Task MonitorWeatherAsync(string cityCode, double thresholdKmH, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var weatherService = scope.ServiceProvider.GetRequiredService<IWeatherService>();
        var crisisService = scope.ServiceProvider.GetRequiredService<IWeatherCrisisService>();

        _logger.LogInformation("Sampling meteorological conditions for {CityCode}", cityCode);

        var weather = await weatherService.GetCurrentWeatherAsync(cityCode);
        if (weather == null)
        {
            _logger.LogWarning("Meteorological service returned null payload for {CityCode}", cityCode);
            return;
        }

        var windSpeedKmH = weather.WindSpeed * 3.6;
        var windGustKmH = (weather.WindGust ?? 0) * 3.6;
        var effectiveWindSpeed = Math.Max(windSpeedKmH, windGustKmH);

        _logger.LogInformation(
            "{City} ({CityCode}) -> Wind: {Speed:F1} km/h (Gusts: {Gust:F1} km/h) | Temp: {Temp}C | Condition: {Desc}",
            weather.CityName, weather.CityCode, windSpeedKmH, windGustKmH, weather.Temperature, weather.Description);

        if (effectiveWindSpeed >= thresholdKmH)
        {
            var result = await crisisService.TriggerWindCrisisAsync(
                cityCode,
                effectiveWindSpeed,
                thresholdKmH,
                $"Automated Meteorological Alert: {weather.Description}, Gusts: {windGustKmH:F1} km/h");

            if (result.Success && result.Data?.NotifiedUsersCount > 0)
            {
                _logger.LogCritical("Crisis workflow successfully triggered: {Message}", result.Data.Message);
            }
        }
        else
        {
            var statusResult = await crisisService.GetCrisisStatusAsync();
            if (statusResult.Data?.IsCrisisActive == true)
            {
                var resolveResult = await crisisService.ResolveWindCrisisAsync(cityCode, effectiveWindSpeed);
                if (resolveResult.Success)
                {
                    _logger.LogInformation("Crisis condition resolved: {Message}", resolveResult.Data?.Message);
                }
            }
        }
    }
}
