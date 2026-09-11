using System.Text;
using AeroPulse.Application.Interfaces;
using AeroPulse.Application.Services;
using AeroPulse.Infrastructure.BackgroundServices;
using AeroPulse.Infrastructure.Data;
using AeroPulse.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

namespace AeroPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantService, TenantService>();

        services.AddDbContext<AeroPulseDbContext>(options =>
            options.UseSqlite(
                configuration.GetConnectionString("DefaultConnection") ?? "Data Source=AeroPulse.db",
                b => b.MigrationsAssembly(typeof(AeroPulseDbContext).Assembly.FullName)));

        services.AddScoped<IAeroPulseDbContext>(provider => provider.GetRequiredService<AeroPulseDbContext>());

        // JWT Authentication
        var jwtKey = configuration["Jwt:Key"] ?? "AeroPulse-Super-Secret-Key-2026-MustBe32Chars!";
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = configuration["Jwt:Issuer"] ?? "AeroPulse",
                ValidAudience = configuration["Jwt:Audience"] ?? "AeroPulseApp",
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ClockSkew = TimeSpan.Zero
            };
        });

        // ===== CORE SERVICES (Mevcut) =====
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAircraftService, AircraftService>();
        services.AddScoped<IPartService, PartService>();
        services.AddScoped<IMaintenanceService, MaintenanceService>();
        services.AddScoped<IDashboardService, DashboardService>();

        // ===== MODÜL 3: OPERATIONS & FAULT REPORTS =====
        services.AddScoped<IOperationService, OperationService>();
        services.AddScoped<IFaultReportService, FaultReportService>();

        // ===== MODÜL 3B: JET BRIDGE =====
        services.AddScoped<IJetBridgeService, JetBridgeService>();

        // ===== MODÜL 4: NOTIFICATIONS =====
        services.AddScoped<INotificationService, NotificationService>();

        // ===== MESAJ KUYRUĞU =====
        var rabbitMqConnection = configuration.GetConnectionString("RabbitMQ");
        if (!string.IsNullOrEmpty(rabbitMqConnection))
        {
            services.AddScoped<IMessageBusService, RabbitMqMessageBusService>();
        }
        else
        {
            services.AddScoped<IMessageBusService, InMemoryMessageBusService>();
        }

        // ===== CACHE =====
        services.AddMemoryCache(); // IMemoryCache için gerekli

        var redisConnection = configuration.GetConnectionString("Redis");
        var useRedisCache = false;

        if (!string.IsNullOrWhiteSpace(redisConnection))
        {
            try
            {
                var redisOptions = ConfigurationOptions.Parse(redisConnection);
                redisOptions.AbortOnConnectFail = false;
                redisOptions.ConnectTimeout = 1500;
                redisOptions.SyncTimeout = 1500;

                using var redis = ConnectionMultiplexer.Connect(redisOptions);
                useRedisCache = redis.IsConnected;
            }
            catch (Exception)
            {
                useRedisCache = false;
            }
        }

        if (useRedisCache)
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                ConnectionMultiplexer.Connect(redisConnection!));
            services.AddScoped<ICacheService, RedisCacheService>();
        }
        else
        {
            Console.WriteLine("Redis sunucusu erişilemediği için cache olarak InMemoryCacheService kullanılacak.");
            services.AddScoped<ICacheService, InMemoryCacheService>();
        }

        // ===== HAVA DURUMU SERVİSİ (OpenWeatherMap) =====
        // API anahtarı olmadan mock modda çalışır.
        // Gerçek veri için appsettings.json: "Weather": { "ApiKey": "YOUR_KEY" }
        services.AddHttpClient<IWeatherService, OpenWeatherService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("User-Agent", "AeroPulse/1.0");
        });

        // ===== MODÜL 7: DIŞ VERİ & KRİZ YÖNETİMİ =====
        services.AddScoped<IWeatherCrisisService, WeatherCrisisService>();
        services.AddScoped<IFlightEventProcessorService, FlightEventProcessorService>();

        // ===== ARKA PLAN İŞÇİLERİ (Background Services / Workers) =====
        services.AddHostedService<WeatherMonitorWorker>();

        return services;
    }
}
