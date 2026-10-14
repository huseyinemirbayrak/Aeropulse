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

namespace AeroPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantService, TenantService>();

        services.AddDbContext<AeroPulseDbContext>(options =>
            options.UseSqlite(
                configuration.GetConnectionString("DefaultConnection") ?? "Data Source=AeroPulse.db",
                b => b.MigrationsAssembly(typeof(AeroPulseDbContext).Assembly.FullName)));

        services.AddScoped<IAeroPulseDbContext>(provider => provider.GetRequiredService<AeroPulseDbContext>());

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

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAircraftService, AircraftService>();
        services.AddScoped<IPartService, PartService>();
        services.AddScoped<IMaintenanceService, MaintenanceService>();
        services.AddScoped<IDashboardService, DashboardService>();

        services.AddScoped<IOperationService, OperationService>();
        services.AddScoped<IFaultReportService, FaultReportService>();

        services.AddScoped<IJetBridgeService, JetBridgeService>();

        services.AddScoped<INotificationService, NotificationService>();

        services.AddScoped<IMessageBusService, InMemoryMessageBusService>();

        services.AddMemoryCache();
        services.AddScoped<ICacheService, InMemoryCacheService>();

        services.AddHttpClient<IWeatherService, OpenWeatherService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("User-Agent", "AeroPulse/1.0");
        });

        services.AddScoped<IWeatherCrisisService, WeatherCrisisService>();
        services.AddScoped<IFlightEventProcessorService, FlightEventProcessorService>();

        services.AddHostedService<WeatherMonitorWorker>();

        return services;
    }
}
