using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AeroPulse.Application.DTOs;
using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AeroPulse.Infrastructure.Services;

/// <summary>
/// OpenWeatherMap API'sine HttpClient ile istek atarak hava durumu verisi sağlayan servis.
/// API anahtarı yapılandırılmamışsa mock veri döndürür.
/// </summary>
public class OpenWeatherService : IWeatherService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OpenWeatherService> _logger;
    private readonly string? _apiKey;
    private readonly string _baseUrl;
    private readonly bool _useMock;

    // ICAO/IATA kodlarından şehir ismine çeviri tablosu
    private static readonly Dictionary<string, string> AirportCityMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── Türkiye ──
        ["IST"]  = "Istanbul",
        ["LTFM"] = "Istanbul",
        ["SAW"]  = "Istanbul",
        ["LTFJ"] = "Istanbul",
        ["ESB"]  = "Ankara",
        ["LTAC"] = "Ankara",
        ["ADB"]  = "Izmir",
        ["LTBJ"] = "Izmir",
        ["AYT"]  = "Antalya",
        ["LTAI"] = "Antalya",

        // ── Avrupa ──
        ["LHR"]  = "London",
        ["EGLL"] = "London",
        ["CDG"]  = "Paris",
        ["LFPG"] = "Paris",
        ["FRA"]  = "Frankfurt",
        ["EDDF"] = "Frankfurt",
        ["BCN"]  = "Barcelona",
        ["LEBL"] = "Barcelona",
        ["FCO"]  = "Rome",
        ["LIRF"] = "Rome",
        ["AMS"]  = "Amsterdam",
        ["EHAM"] = "Amsterdam",
        ["PRG"]  = "Prague",
        ["LKPR"] = "Prague",
        ["ATH"]  = "Athens",
        ["LGAV"] = "Athens",

        // ── Amerika ──
        ["JFK"]  = "New York",
        ["KJFK"] = "New York",
        ["LAX"]  = "Los Angeles",
        ["KLAX"] = "Los Angeles",
        ["MIA"]  = "Miami",
        ["KMIA"] = "Miami",
        ["SFO"]  = "San Francisco",
        ["KSFO"] = "San Francisco",
        ["CUN"]  = "Cancun",
        ["MMUN"] = "Cancun",
        ["LAS"]  = "Las Vegas",
        ["KLAS"] = "Las Vegas",

        // ── Asya & Ortadoğu ──
        ["DXB"]  = "Dubai",
        ["OMDB"] = "Dubai",
        ["BKK"]  = "Bangkok",
        ["VTBS"] = "Bangkok",
        ["SIN"]  = "Singapore",
        ["WSSS"] = "Singapore",
        ["NRT"]  = "Tokyo",
        ["RJAA"] = "Tokyo",
        ["HKG"]  = "Hong Kong",
        ["VHHH"] = "Hong Kong",
    };

    public OpenWeatherService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenWeatherService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["Weather:ApiKey"];
        _baseUrl = configuration["Weather:BaseUrl"] ?? "https://api.openweathermap.org/data/2.5";
        _useMock = string.IsNullOrWhiteSpace(_apiKey);

        if (_useMock)
        {
            _logger.LogWarning(
                "Weather:ApiKey yapılandırılmamış. OpenWeatherService mock modda çalışacak. " +
                "Gerçek veri için appsettings.json'a Weather:ApiKey ekleyin.");
        }
    }

    /// <inheritdoc />
    public async Task<WeatherData> GetCurrentWeatherAsync(string cityCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cityCode);

        if (_useMock)
        {
            _logger.LogInformation("Mock hava durumu verisi döndürülüyor: {CityCode}", cityCode);
            return GenerateMockWeatherData(cityCode);
        }

        try
        {
            var cityName = ResolveCityName(cityCode);
            var requestUrl = $"{_baseUrl}/weather?q={Uri.EscapeDataString(cityName)}&appid={_apiKey}&units=metric&lang=tr";

            _logger.LogInformation("OpenWeatherMap API isteği: {CityCode} → {CityName}", cityCode, cityName);

            var response = await _httpClient.GetAsync(requestUrl);
            response.EnsureSuccessStatusCode();

            var apiResponse = await response.Content.ReadFromJsonAsync<OpenWeatherApiResponse>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (apiResponse is null)
                throw new InvalidOperationException("API'den boş yanıt alındı.");

            var weatherData = MapToWeatherData(apiResponse, cityCode);

            _logger.LogInformation(
                "Hava durumu alındı: {City} → {Temp}°C, {Desc}",
                weatherData.CityName, weatherData.Temperature, weatherData.Description);

            return weatherData;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "OpenWeatherMap API hatası: {CityCode}", cityCode);

            // API hatası durumunda mock veriye fallback
            _logger.LogWarning("API hatası nedeniyle mock veri döndürülüyor: {CityCode}", cityCode);
            return GenerateMockWeatherData(cityCode);
        }
    }

    /// <inheritdoc />
    public async Task<List<WeatherForecastItem>> GetForecastAsync(string cityCode, int hours = 24)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cityCode);

        if (_useMock)
        {
            _logger.LogInformation("Mock tahmin verisi döndürülüyor: {CityCode}, {Hours} saat", cityCode, hours);
            return GenerateMockForecast(cityCode, hours);
        }

        try
        {
            var cityName = ResolveCityName(cityCode);
            var requestUrl = $"{_baseUrl}/forecast?q={Uri.EscapeDataString(cityName)}&appid={_apiKey}&units=metric&lang=tr";

            var response = await _httpClient.GetAsync(requestUrl);
            response.EnsureSuccessStatusCode();

            var apiResponse = await response.Content.ReadFromJsonAsync<OpenWeatherForecastApiResponse>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (apiResponse?.List is null)
                throw new InvalidOperationException("Forecast API'den boş yanıt alındı.");

            // İstenen saat kadar veriyi al (her biri 3 saatlik aralıklar)
            var count = Math.Min(hours / 3, apiResponse.List.Count);

            return apiResponse.List
                .Take(count)
                .Select(item => new WeatherForecastItem
                {
                    DateTime = DateTimeOffset.FromUnixTimeSeconds(item.Dt).UtcDateTime,
                    Temperature = item.Main?.Temp ?? 0,
                    FeelsLike = item.Main?.FeelsLike ?? 0,
                    Humidity = item.Main?.Humidity ?? 0,
                    Description = item.Weather?.FirstOrDefault()?.Description ?? "Bilinmiyor",
                    Icon = item.Weather?.FirstOrDefault()?.Icon ?? "01d",
                    WindSpeed = item.Wind?.Speed ?? 0,
                    WindDeg = item.Wind?.Deg ?? 0,
                    Visibility = item.Visibility,
                    PrecipitationProbability = item.Pop * 100
                })
                .ToList();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "OpenWeatherMap Forecast API hatası: {CityCode}", cityCode);
            return GenerateMockForecast(cityCode, hours);
        }
    }

    // ───────────────────────── Yardımcı Metotlar ─────────────────────────

    private static string ResolveCityName(string cityCode)
    {
        return AirportCityMap.TryGetValue(cityCode, out var city)
            ? city
            : cityCode; // Bilinmeyen kod → doğrudan API'ye gönder
    }

    private static WeatherData MapToWeatherData(OpenWeatherApiResponse api, string cityCode)
    {
        return new WeatherData
        {
            CityCode = cityCode,
            CityName = api.Name ?? cityCode,
            Temperature = api.Main?.Temp ?? 0,
            FeelsLike = api.Main?.FeelsLike ?? 0,
            TempMin = api.Main?.TempMin ?? 0,
            TempMax = api.Main?.TempMax ?? 0,
            Humidity = api.Main?.Humidity ?? 0,
            Pressure = api.Main?.Pressure ?? 0,
            Description = api.Weather?.FirstOrDefault()?.Description ?? "Bilinmiyor",
            Icon = api.Weather?.FirstOrDefault()?.Icon ?? "01d",
            WindSpeed = api.Wind?.Speed ?? 0,
            WindDeg = api.Wind?.Deg ?? 0,
            WindGust = api.Wind?.Gust,
            Visibility = api.Visibility,
            CloudCoverage = api.Clouds?.All ?? 0,
            Sunrise = api.Sys != null
                ? DateTimeOffset.FromUnixTimeSeconds(api.Sys.Sunrise).UtcDateTime
                : null,
            Sunset = api.Sys != null
                ? DateTimeOffset.FromUnixTimeSeconds(api.Sys.Sunset).UtcDateTime
                : null,
            RetrievedAt = DateTime.UtcNow
        };
    }

    private static WeatherData GenerateMockWeatherData(string cityCode)
    {
        var rng = new Random(cityCode.GetHashCode() ^ DateTime.UtcNow.Hour);
        var cityName = AirportCityMap.TryGetValue(cityCode, out var city) ? city : cityCode;

        string[] descriptions = ["Açık", "Parçalı bulutlu", "Kapalı", "Hafif yağmurlu", "Sisli"];
        string[] icons = ["01d", "02d", "04d", "10d", "50d"];
        var idx = rng.Next(descriptions.Length);

        return new WeatherData
        {
            CityCode = cityCode,
            CityName = cityName,
            Temperature = Math.Round(15 + rng.NextDouble() * 25, 1),
            FeelsLike = Math.Round(14 + rng.NextDouble() * 25, 1),
            TempMin = Math.Round(12 + rng.NextDouble() * 10, 1),
            TempMax = Math.Round(25 + rng.NextDouble() * 15, 1),
            Humidity = rng.Next(30, 90),
            Pressure = rng.Next(1005, 1030),
            Description = descriptions[idx],
            Icon = icons[idx],
            WindSpeed = Math.Round(rng.NextDouble() * 15, 1),
            WindDeg = rng.Next(0, 360),
            WindGust = rng.NextDouble() > 0.5 ? Math.Round(rng.NextDouble() * 25, 1) : null,
            Visibility = rng.Next(5000, 10000),
            CloudCoverage = rng.Next(0, 100),
            Sunrise = DateTime.UtcNow.Date.AddHours(5).AddMinutes(rng.Next(0, 60)),
            Sunset = DateTime.UtcNow.Date.AddHours(18).AddMinutes(rng.Next(0, 60)),
            RetrievedAt = DateTime.UtcNow
        };
    }

    private static List<WeatherForecastItem> GenerateMockForecast(string cityCode, int hours)
    {
        var rng = new Random(cityCode.GetHashCode());
        var items = new List<WeatherForecastItem>();
        var baseTemp = 15 + rng.NextDouble() * 20;
        var now = DateTime.UtcNow;

        string[] descriptions = ["Açık", "Parçalı bulutlu", "Bulutlu", "Hafif yağmur", "Sağanak"];
        string[] icons = ["01d", "02d", "04d", "10d", "09d"];

        for (int i = 0; i < hours / 3; i++)
        {
            var idx = rng.Next(descriptions.Length);
            var hourOffset = i * 3;
            var temp = baseTemp + Math.Sin(hourOffset * 0.3) * 5 + rng.NextDouble() * 3;

            items.Add(new WeatherForecastItem
            {
                DateTime = now.AddHours(hourOffset),
                Temperature = Math.Round(temp, 1),
                FeelsLike = Math.Round(temp - 1 + rng.NextDouble() * 2, 1),
                Humidity = rng.Next(30, 90),
                Description = descriptions[idx],
                Icon = icons[idx],
                WindSpeed = Math.Round(rng.NextDouble() * 15, 1),
                WindDeg = rng.Next(0, 360),
                Visibility = rng.Next(5000, 10000),
                PrecipitationProbability = Math.Round(rng.NextDouble() * 100, 0)
            });
        }

        return items;
    }

    // ───────────────────────── OpenWeatherMap API JSON Modelleri ─────────────────────────

    private class OpenWeatherApiResponse
    {
        public string? Name { get; set; }
        public OpenWeatherMain? Main { get; set; }
        public List<OpenWeatherWeatherItem>? Weather { get; set; }
        public OpenWeatherWind? Wind { get; set; }
        public OpenWeatherClouds? Clouds { get; set; }
        public OpenWeatherSys? Sys { get; set; }
        public int Visibility { get; set; }
    }

    private class OpenWeatherForecastApiResponse
    {
        public List<OpenWeatherForecastItem>? List { get; set; }
    }

    private class OpenWeatherForecastItem
    {
        public long Dt { get; set; }
        public OpenWeatherMain? Main { get; set; }
        public List<OpenWeatherWeatherItem>? Weather { get; set; }
        public OpenWeatherWind? Wind { get; set; }
        public int Visibility { get; set; }
        public double Pop { get; set; }
    }

    private class OpenWeatherMain
    {
        public double Temp { get; set; }

        [JsonPropertyName("feels_like")]
        public double FeelsLike { get; set; }

        [JsonPropertyName("temp_min")]
        public double TempMin { get; set; }

        [JsonPropertyName("temp_max")]
        public double TempMax { get; set; }

        public int Pressure { get; set; }
        public int Humidity { get; set; }
    }

    private class OpenWeatherWeatherItem
    {
        public string? Main { get; set; }
        public string? Description { get; set; }
        public string? Icon { get; set; }
    }

    private class OpenWeatherWind
    {
        public double Speed { get; set; }
        public int Deg { get; set; }
        public double? Gust { get; set; }
    }

    private class OpenWeatherClouds
    {
        public int All { get; set; }
    }

    private class OpenWeatherSys
    {
        public long Sunrise { get; set; }
        public long Sunset { get; set; }
    }
}
