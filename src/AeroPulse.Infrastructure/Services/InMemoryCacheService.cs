using AeroPulse.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace AeroPulse.Infrastructure.Services;

/// <summary>
/// .NET'in yerleşik IMemoryCache altyapısını kullanan In-Memory Önbellekleme (Cache) servisi.
/// Sık sorgulanan verilerin (müsait körükler, kriz durumu vb.) RAM üzerinde hızlıca önbelleğe alınmasını sağlar.
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
