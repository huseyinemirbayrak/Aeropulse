using AeroPulse.API.Hubs;
using AeroPulse.API.Services;
using AeroPulse.Application.Interfaces;
using AeroPulse.Infrastructure;
using AeroPulse.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Real-Time SignalR Hub & Notifier
builder.Services.AddSignalR();
builder.Services.AddScoped<IRealTimeNotifier, SignalRRealTimeNotifier>();

// Infrastructure (DB, Auth, Services)
builder.Services.AddInfrastructure(builder.Configuration);

// Swagger
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

// CORS - SignalR WebSockets requires credentials and flexible origin matching
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

// Apply migrations and seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AeroPulseDbContext>();
    await context.Database.EnsureCreatedAsync();
    await DataSeeder.EnsureTenantDataAsync(context);
    await DataSeeder.SeedAsync(context);
    await DataSeeder.EnsureExtraDemoDataAsync(context);
    await DataSeeder.EnsureOperationalDataAsync(context);
    try { await StoredProceduresAndViews.CreateStoredProceduresAndViewsAsync(context); } catch { /* LocalDB might not support all features */ }
}

// Configure pipeline
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
    <html lang="tr">
    <head>
        <meta charset="utf-8" />
        <title>AeroPulse</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #0f172a;
                color: #e2e8f0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
            }
            .card {
                background: #111827;
                border-radius: 16px;
                padding: 32px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                max-width: 760px;
                width: 90%;
            }
            a {
                color: #7dd3fc;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
            .badge {
                display: inline-block;
                background: #1d4ed8;
                color: white;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 16px;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">AeroPulse API</div>
            <h1>AeroPulse çalışıyor</h1>
            <p>Bu adres API sunucusudur. Swagger arayüzüne erişmek için aşağıdaki bağlantıyı kullanabilirsiniz.</p>
            <p><a href="/swagger">Swagger UI aç</a></p>
            <p><a href="/health">Sağlık kontrolü</a></p>
            <p>Not: Web arayüzü ayrı bir Angular uygulaması olarak çalıştırılır. Gerekirse <strong>npm start</strong> ile aeropulse-web'i başlatabilirsiniz.</p>
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
