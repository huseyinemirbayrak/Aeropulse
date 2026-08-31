namespace AeroPulse.Application.Interfaces;

/// <summary>
/// Cache servisi (Redis veya In-Memory IMemoryCache) için soyutlama arayüzü.
/// Redis hazır değilse in-memory ile aynı kodla çalışır.
/// </summary>
public interface ICacheService
{
    /// <summary>Cache'e bir değer yazar.</summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);

    /// <summary>Cache'ten bir değer okur. Yoksa null döner.</summary>
    Task<T?> GetAsync<T>(string key);

    /// <summary>Cache'ten bir anahtarı siler.</summary>
    Task RemoveAsync(string key);

    /// <summary>Cache'te anahtar var mı kontrol eder.</summary>
    Task<bool> ExistsAsync(string key);
}
