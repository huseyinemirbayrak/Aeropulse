using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace AeroPulse.Infrastructure.Services;

/// <summary>
/// Redis'in in-memory simülasyonu.
/// .NET'in yerleşik IMemoryCache'ini kullanır.
/// 
/// GERÇEĞİNE GEÇİŞ: appsettings.json'da Redis bağlantısı doldurunca
/// DependencyInjection.cs'de:
///   services.AddScoped<ICacheService, InMemoryCacheService>();
///   →
///   services.AddScoped<ICacheService, RedisCacheService>();
/// 
/// NOT: IMemoryCache uygulama içi (tek process) çalışır.
///      Redis ise birden fazla sunucu arasında paylaşılan bir cache sağlar.
///      Yük dengeleme (load balancing) senaryolarında Redis şarttır.
/// </summary>
public class InMemoryCacheService : ICacheService
{
    private readonly IMemoryCache _cache;

    public InMemoryCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        var options = new MemoryCacheEntryOptions();
        if (expiry.HasValue)
            options.AbsoluteExpirationRelativeToNow = expiry;
        else
            options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30); // Varsayılan 30 dk

        _cache.Set(key, value, options);
        return Task.CompletedTask;
    }

    public Task<T?> GetAsync<T>(string key)
    {
        _cache.TryGetValue(key, out T? value);
        return Task.FromResult(value);
    }

    public Task RemoveAsync(string key)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string key)
    {
        return Task.FromResult(_cache.TryGetValue(key, out _));
    }
}
