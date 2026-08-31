using System.Text;
using AeroPulse.Application.Interfaces;
using AeroPulse.Application.Services;
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
        // Database
        services.AddDbContext<AeroPulseDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
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

        // ===== MESAJ KUYRUĞU (RabbitMQ simülatörü) =====
        // Geliştirme ortamı: in-memory (log'a yazar)
        // Production'a geçmek için: InMemoryMessageBusService → RabbitMqMessageBusService
        services.AddScoped<IMessageBusService, InMemoryMessageBusService>();

        // ===== CACHE (Redis simülatörü) =====
        // Geliştirme ortamı: IMemoryCache kullanan in-memory implementasyon
        // Production'a geçmek için: InMemoryCacheService → RedisCacheService
        services.AddMemoryCache(); // IMemoryCache için gerekli
        services.AddScoped<ICacheService, InMemoryCacheService>();

        return services;
    }
}
