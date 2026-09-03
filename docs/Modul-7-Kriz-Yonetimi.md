# Modül 7: Dış Veri Entegrasyonları ve Kriz Yönetimi (Simülasyonlar)

Bu döküman, AeroPulse projesine dış kaynaklardan (Hava Durumu API'si, Uçuş Radarı vb.) veri alıp, sistemde otomatik olarak kriz/acil durum senaryoları tetikleme özelliklerini nasıl kodlayabileceğinizi adım adım anlatmaktadır.

---

## Senaryo 1: Hava Durumu (OpenWeather API) ve Rüzgar Krizi

**Senaryo:** Belirli bir lokasyon (örneğin İstanbul Havalimanı) için hava durumunu periyodik olarak kontrol ederiz. Rüzgar hızı belirli bir limiti (örn: 80 km/s - Windshear) geçerse, sistem tüm körükleri (Jet Bridges) güvenlik amacıyla "Kullanım Dışı (Out of Service)" statüsüne çeker ve acil durum bildirimi oluşturur.

### Nasıl Kodlanır? (Mimari Adımlar)

1. **`IWeatherService` Arayüzü ve `OpenWeatherService` Sınıfı (Infrastructure Katmanı):**
   - OpenWeatherMap API'sine (veya mock bir servise) `HttpClient` ile istek atıp JSON yanıtını parse edecek bir servis oluşturulur.
   - Örnek Metot: `Task<WeatherData> GetCurrentWeatherAsync(string cityCode);`
   
2. **Arka Plan Görevi (Background Worker) - [TAMAMLANDI]:**
   - .NET Core'un `BackgroundService` sınıfından türeyen bir `WeatherMonitorWorker` sınıfı oluşturuldu (`AeroPulse.Infrastructure/BackgroundServices/WeatherMonitorWorker.cs`).
   - `ExecuteAsync` metodu içinde `while (!stoppingToken.IsCancellationRequested)` döngüsü ile yapılandırılabilir periyotta (varsayılan 5 dk) `Task.Delay` çalışması sağlandı.
   - Her döngüde `IWeatherService` üzerinden rüzgâr hızı kontrol ediliyor.

3. **Krizin Tetiklenmesi (Emniyet & Otomasyon Katmanı) - [TAMAMLANDI]:**
   - Rüzgâr hızı belirlenen eşiği (örn: 80 km/s - Windshear) aştığında:
     - Körükler güvenlik gerekçesiyle "UnderMaintenance" (Kullanım Dışı) statüsüne alınır ve önbellek (Cache) temizlenir.
     - Operasyon Yöneticisi ve Admin rollerine kritik seviyeli bildirim (`INotificationService`) gönderilir.
     - Mesaj kuyruğuna (`IMessageBusService`) acil durum olayı fırlatılır.
     - Aşırı bildirim (spam) koruması ile kriz aktifken tekrarlayan uyarılar engellenir.
     - Rüzgâr güvenli seviyeye gerilediğinde kriz çözüldü bildirimi iletilir.

---

## Senaryo 2: Uçuş Gecikme (Delay) Simülatörü ve SLA İhlali

**Senaryo:** Dış bir kaynaktan (veya simüle edilen bir uçuş veri tabanından) gelen bilgilere göre bir uçağın inişi ciddi şekilde rötar yerse (örn: 3 saat), bu uçağa bağlı operasyonlar (körük tahsisi, bakım ekibi programı) tehlikeye girer. Sistem bunu "SLA İhlal Riski" olarak raporlar.

### Nasıl Kodlanır? (Mimari Adımlar)

1. **Simülasyon veya Webhook (API Katmanı):**
   - Uçuş verileri genelde Webhook (dış sistemin bizim API'mize veri göndermesi) ile çalışır.
   - `FlightEventsController` adında dışarıya açık bir endpoint yazın: `POST /api/flight-events/delay`
   - Buraya JSON olarak `{"aircraftId": "...", "delayMinutes": 180}` verisi gelir.

2. **Gecikme Analizi (Application Katmanı):**
   - `IFlightEventProcessorService` adında bir servis oluşturun.
   - Bu servis, gecikme geldiğinde şunları kontrol eder:
     - Geciken uçak için planlanmış bir Bakım (Maintenance) var mı? 
     - Geciken uçak için rezerve edilmiş bir Körük (Jet Bridge) var mı?

3. **SLA İhlal Tespiti ve Krizin Oluşturulması:**
   - Eğer planlanmış bir bakım varsa ve uçağın yeni geliş saati bakım ekibinin mesaisini aşıyorsa veya 3 saatlik bir gecikme bakım sırasını bozuyorsa;
   - `FaultReportsController`'ı da besleyen sisteme otomatik olarak yeni bir kayıt açılır: **"SLA Risk Alert: Uçak [ID] için bakım zamanlaması aşıldı!"**
   - Bu uyarı Operasyon Yöneticisinin (Operations Manager) ana ekranına düşer.

---

## 🛠 Teknik İpuçları (Kendiniz Kodlarken Dikkat Etmeniz Gerekenler)

*   **Dependency Injection (DI) & Background Services:** 
    BackgroundService'ler (Worker'lar) *Singleton* olarak çalışır, ancak veritabanı işlemlerini yaptığınız servisleriniz (Scoped) olacaktır. Bir Worker içinden veritabanına erişmek için `IServiceScopeFactory` kullanıp yeni bir "Scope" yaratmanız ( `using (var scope = _scopeFactory.CreateScope())` ) gerekir. Aksi takdirde DI hatası alırsınız.
*   **Aşırı Bildirim (Spam) Koruması:** 
    Hava durumu her 5 dakikada bir kontrol edildiğinde, eğer rüzgar sürekli 80 km/s üzerindeyse her seferinde yeni kriz açmamalısınız. Sistemde "Aktif bir hava durumu krizi var mı?" kontrolü tutmalısınız.
*   **Gerçekçilik Katın:**
    Gerçek OpenWeather API'si kullanmak yerine başlangıçta random değerler üreten bir MockWeatherService (Simülatör) yazmanız geliştirme hızınızı çok artıracaktır. Sistem tam oturduğunda gerçek API key'inizi girip canlıya alabilirsiniz.

Kolay gelsin! Aeropulse bu geliştirmelerle harika bir seviyeye çıkacak.
