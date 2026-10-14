using AeroPulse.API.Hubs;
using AeroPulse.API.Services;
using AeroPulse.Application.Interfaces;
using AeroPulse.Infrastructure;
using AeroPulse.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddSignalR();
builder.Services.AddScoped<IRealTimeNotifier, SignalRRealTimeNotifier>();

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AeroPulseDbContext>();
    await context.Database.EnsureCreatedAsync();
    await DataSeeder.EnsureTenantDataAsync(context);
    await DataSeeder.SeedAsync(context);
    await DataSeeder.EnsureExtraDemoDataAsync(context);
    await DataSeeder.EnsureOperationalDataAsync(context);
}

app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AeroPulse API v1");
    c.RoutePrefix = "swagger";
});

app.MapGet("/", () => Results.Content(
    """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>AeroPulse Core Gateway</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #0b132b;
                color: #e2e8f0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
            }
            .card {
                background: #1c2541;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 36px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
                max-width: 680px;
                width: 90%;
            }
            h1 {
                font-size: 24px;
                margin: 0 0 12px 0;
                font-weight: 600;
                letter-spacing: -0.5px;
            }
            p {
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 16px 0;
            }
            a {
                color: #38bdf8;
                text-decoration: none;
                font-weight: 500;
            }
            a:hover {
                text-decoration: underline;
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(14, 165, 233, 0.15);
                color: #38bdf8;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 20px;
                border: 1px solid rgba(14, 165, 233, 0.3);
            }
            .actions {
                display: flex;
                gap: 12px;
                margin-top: 24px;
            }
            .btn {
                display: inline-block;
                padding: 10px 18px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
            }
            .btn-primary {
                background: #0284c7;
                color: #ffffff;
            }
            .btn-primary:hover {
                background: #0369a1;
                text-decoration: none;
            }
            .btn-secondary {
                background: #334155;
                color: #f1f5f9;
            }
            .btn-secondary:hover {
                background: #475569;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">AeroPulse Enterprise Core API</div>
            <h1>AeroPulse API Gateway Active</h1>
            <p>Enterprise mission-critical aviation operations, multi-tenant fleet isolation, and MRO telemetry service is online and operating nominally.</p>
            <div class="actions">
                <a href="/swagger" class="btn btn-primary">Open Swagger UI</a>
                <a href="/health" class="btn btn-secondary">System Health</a>
            </div>
        </div>
    </body>
    </html>
    """, "text/html"));

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    message = "AeroPulse API is running.",
    swagger = "/swagger"
}));

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<AeroPulseHub>("/hubs/aeropulse");

app.Run();
