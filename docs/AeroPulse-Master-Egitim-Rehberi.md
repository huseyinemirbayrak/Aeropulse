# 🎓 AeroPulse Masterclass: Sıfırdan Zirveye Yazılım Eğitimi Rehberi

> **Öğretmenin Notu:**  
> Sevgili öğrencim, bu rehber senin için hazırlandı. Bu dokümanı okurken acele etme. Bir kahve al, her bir bölümü dikkatle incele. Burada sadece "kodun ne olduğunu" değil, **"neden öyle yazıldığını", "yazılmasaydı sistemin nasıl çökeceğini" ve "arkasında yatan yazılım mühendisliği prensiplerini"** bir usta-çırak ilişkisiyle konuşacağız.
>
> Bu projenin adı **AeroPulse (Havacılık Nabzı)**. Havalimanı operasyonlarını, uçak bakımlarını (MRO), körük tahsislerini ve acil durum krizlerini yöneten kurumsal (Enterprise) düzeyde bir yazılımdır.

---

## 🗺️ İçindekiler
1. [Bölüm 1: Büyük Resim — Clean Architecture Nedir ve Neden Kullanılır?](#bölüm-1-büyük-resim--clean-architecture-nedir-ve-neden-kullanılır)
2. [Bölüm 2: Temel Kavramlar ve Terimler Sözlüğü (Sıfırdan Başlayanlara)](#bölüm-2-temel-kavramlar-ve-terimler-sözlüğü-sıfırdan-başlayanlara)
3. [Bölüm 3: Domain Katmanı — Sistemin Kalbi ve Veri Modelleri](#bölüm-3-domain-katmanı--sistemin-kalbi-ve-veri-modelleri)
4. [Bölüm 4: Application Katmanı — İş Mantığı, DTO'lar ve Algoritmalar](#bölüm-4-application-katmanı--iş-mantığı-dtolar-ve-algoritmalar)
5. [Bölüm 5: Infrastructure Katmanı — Dış Dünya, DB, Cache ve Worker](#bölüm-5-infrastructure-katmanı--dış-dünya-db-cache-ve-worker)
6. [Bölüm 6: API Katmanı — Dünyaya Açılan Kapı ve Güvenlik](#bölüm-6-api-katmanı--dünyaya-açılan-kapı-ve-güvenlik)
7. [Bölüm 7: Ön Yüz (Frontend) Nasıl Haberleşir?](#bölüm-7-ön-yüz-frontend-nasıl-haberleşir)
8. [Bölüm 8: Teknik Mülakatlara Hazırlık (Soru & Cevap)](#bölüm-8-teknik-mülakatlara-hazırlık-soru--cevap)

---

## Bölüm 1: Büyük Resim — Clean Architecture Nedir ve Neden Kullanılır?

Geleneksel acemi projelerinde veritabanı kodları, hesaplamalar ve buton tıklamaları tek bir dosya içine yazılır ("Spaghetti Code"). Proje büyüdüğünde bir yeri değiştirirseniz beş farklı yer bozulur.

AeroPulse'da dünyanın en saygın yazılım mimarisi olan **Clean Architecture (Temiz Mimari)** yaklaşımını kullandık. Projemiz 4 ana katmandan oluşur:

```
  ┌─────────────────────────────────────────────────────────┐
  │                    AeroPulse.API                        │  <-- Dış Kapı (HTTP İstekleri, Controllers)
  └───────────────────────────┬─────────────────────────────┘
                              │ Bağımlıdır
  ┌───────────────────────────▼─────────────────────────────┐
  │              AeroPulse.Infrastructure                   │  <-- Dış Araçlar (Veritabanı, Cache, RabbitMQ, Weather)
  └───────────────────────────┬─────────────────────────────┘
                              │ Bağımlıdır
  ┌───────────────────────────▼─────────────────────────────┐
  │               AeroPulse.Application                     │  <-- Beyin (İş Mantığı, Kurallar, DTO'lar, Servisler)
  └───────────────────────────┬─────────────────────────────┘
                              │ Bağımlıdır
  ┌───────────────────────────▼─────────────────────────────┐
  │                  AeroPulse.Domain                       │  <-- Kalp (Varlıklar, Enum'lar, Hiçbir şeye bağımlı DEĞİL)
  └─────────────────────────────────────────────────────────┘
```

### Altın Kural: Bağımlılık Yönü (Dependency Inversion)
- **Domain Katmanı:** En içtedir. Başka hiçbir projeye referans vermez. Saf C# kodudur. Yarın Entity Framework'ü silseniz bile Domain sapasağlam kalır.
- **Application Katmanı:** Sadece Domain'i tanır. Veritabanının SQLite mı, SQL Server mı olduğunu bilmez; sadece bir "Interface" üzerinden konuşur.
- **Infrastructure Katmanı:** Dış dünyayla konuşur. Veritabanına gerçekten giden, hava durumunu OpenWeather'dan çeken, Redis'e bağlanan kodlar buradadır.
- **API Katmanı:** Ön yüzün (Angular, Mobil, Postman) kapısını çaldığı yerdir. İstekleri karşılar, ilgili servise devreder ve sonucu döner.

---

## Bölüm 2: Temel Kavramlar ve Terimler Sözlüğü (Sıfırdan Başlayanlara)

Kodları okumadan önce şu 6 temel kavramı zihnine kazıyalım:

### 1. `class` vs `interface` vs `enum`
- **`class` (Sınıf):** Gerçek bir nesnenin şablonudur. Hem özellikleri (Property) hem de çalışan kodları (Method) vardır.
- **`interface` (Arayüz - Sözleşme):** İçinde kod **yazmaz**. Sadece bir kontrattır. *"Bu işi yapacak olan sınıf, şu isimde şu metotları içermek ZORUNDADIR"* der. Örnek: `IWeatherService` bir sözleşmedir; `OpenWeatherService` ise o sözleşmeyi imzalayıp gereğini yapan sınıftır.
- **`enum` (Numaralandırma):** Sabit seçenekler listesidir. Kod içinde `"Aktif"`, `"Pasif"` gibi string metinler yazmak yerine yazım hatasını önlemek için `UserRole.Admin`, `AircraftStatus.InService` gibi numaralandırılmış tipler kullanırız.

### 2. `async` / `await` ve `Task` (Restoran Garsonu Benzetmesi)
- **Senkron (Eski usul):** Garson siparişi mutfağa verir ve yemek pişene kadar mutfakta heykel gibi bekler. Diğer masalara bakamaz. Sistem donar!
- **Asenkron (`async`/`await`):** Garson siparişi mutfağa iletir (`await FırınaAtAsync()`), yemek pişerken diğer müşterilere çay servisi yapar. Yemek hazır olduğunda mutfak çağırır ve yemeği masaya götürür.
- C#'ta uzun süren işlemler (Veritabanı sorguları, HTTP istekleri, dosya okuma) daima `async Task<...>` olarak yazılır.

### 3. Dependency Injection (DI) ve Yaşam Döngüleri
Bir sınıf başka bir sınıfa ihtiyaç duyduğunda `new UcakServisi()` yazmayız! Çünkü bunu yaparsak iki sınıf birbirine sıkı sıkıya yapışır (Tight Coupling). Bunun yerine dışarıdan Constructor'a (Yapıcı Metot) enjekte ederiz.
.NET bize 3 farklı yaşam döngüsü sunar:
- **`Transient`:** Her istendiğinde sıfırdan yepyeni bir kopya oluşturulur.
- **`Scoped`:** Bir HTTP isteği (Request) boyunca aynı nesne kullanılır. İstek bitince çöpe gider. (Veritabanı bağlantıları `DbContext` ve `Service` sınıfları daima Scoped'dır).
- **`Singleton`:** Uygulama çalıştığı sürece hafızada tek bir tane üretilir, herkes aynı nesneyi paylaşır. (`BackgroundService`, Cache bağlantısı vb.).

### 4. `IQueryable` vs `IEnumerable` / `List` (Veritabanı Performansı)
- `_context.Aircraft.Where(a => a.StatusCode == AircraftStatus.InService).ToListAsync()`
- **`IQueryable`:** Filtre henüz veritabanında SQL cümlesine (`WHERE StatusCode = 0`) dönüşür. SQL Server sadece filtrelenmiş 10 kaydı RAM'e getirir. Hızlıdır!
- **`List` / `IEnumerable`:** Önce 1 milyon satırı veritabanından RAM'e çeker, sonra C# içinde filtreler. Sunucuyu kilitler!

---

## Bölüm 3: Domain Katmanı — Sistemin Kalbi ve Veri Modelleri

`AeroPulse.Domain/Entities` klasörüne gidelim. Bu sınıflar veritabanındaki tablolarımızın C# karşılığıdır.

### 1. [BaseEntity.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Domain/Entities/BaseEntity.cs) (Tüm Varlıkların Atası)
```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
```
**Hoca Açıklıyor:**
- **Neden `abstract`?** Çünkü kimse havadan suya bir "BaseEntity" nesnesi üretemez. Sadece miras (inheritance) alınabilir.
- **Neden `Guid`?** Sıralı integer (`1, 2, 3...`) yerine benzersiz 128-bitlik küresel kimlik (`Guid`) kullandık. Böylece dışarıdan biri URL'e `id=5` yazıp diğer kayıtları tahmin edemez (Güvenlik) ve mikroservislerde çakışma yaşanmaz.
- **Neden `DateTime.UtcNow`?** Asla yerel saat kullanmayız! Havacılık evrenseldir. İstanbul'daki uçakla New York'taki uçak aynı UTC saat dilimine göre yönetilir.

---

### 2. [Aircraft.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Domain/Entities/Aircraft.cs) (Uçak Varlığı)
```csharp
public class Aircraft : BaseEntity
{
    public string TailNumber { get; set; } = string.Empty; // TC-JND (Kuyruk Tescili)
    public string Model { get; set; } = string.Empty;      // Airbus A321-200
    public string Operator { get; set; } = string.Empty;   // Turkish Airlines
    public int TotalFlightHours { get; set; }              // Toplam uçuş saati
    public int TotalFlightCycles { get; set; }             // İniş-Kalkış döngüsü (Cycle)
    public AircraftStatus StatusCode { get; set; }

    // İlişkiler (Navigation Properties)
    public ICollection<Part> Parts { get; set; } = new List<Part>();
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();
}
```
**Hoca Açıklıyor:**
- `TotalFlightCycles` havacılık için kritiktir. Bir uçağın kabini her kalkış ve inişte basınçlanır ve genleşir. Metal yorgunluğu saatten çok "Cycle" ile ölçülür.
- `ICollection<Part>`: Bir uçağın yüzlerce parçası olabilir (Bire-Çok ilişki / 1-to-N).

---

### 3. [JetBridge.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Domain/Entities/JetBridge.cs) & [JetBridgeAssignment.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Domain/Entities/JetBridgeAssignment.cs)
- `JetBridge`: Havalimanındaki fiziksel yolcu körüğü (Örn: Terminal: "T1", Köprü: "B12").
- `JetBridgeAssignment`: Köprünün hangi uçağa, hangi saat aralığında tahsis edildiği.
  - `EstimatedArrivalTime` (Tahmini yanaşma)
  - `DisconnectionTime` (Ayrılma zamanı)
  - `Status`: `Planned -> AircraftLanded -> BridgeConnected -> DisembarkingComplete -> Released`

---

## Bölüm 4: Application Katmanı — İş Mantığı, DTO'lar ve Algoritmalar

Application katmanı projenin **"Zekasıdır"**. Kurallar burada çalışır.

### DTO (Data Transfer Object) Mantığı Nedir?
Yeni başlayanların en çok sorduğu soru: *"Hocam zaten elimde `Aircraft` sınıfı var, neden bir de `AircraftDto` veya `CreateAircraftDto` yazıyoruz?"*
1. **Güvenlik:** `User` tablosunda `PasswordHash` vardır. Eğer API doğrudan `User` nesnesini dönerse kullanıcının şifre özeti internete saçılır! DTO ile sadece göstermek istediğimiz alanları paketleriz.
2. **Sonsuz Döngü (Circular Reference):** Uçağın parçaları var, parçanın da ait olduğu uçak var. JSON serileştirici uçaktan parçaya, parçadan uçağa sonsuz döngüye girip çöker. DTO bu bağı koparır.

---

### İncelenen Kritik Algoritmalar

#### 1. Körük Çakışma Kontrol Algoritması ([JetBridgeService.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Application/Services/JetBridgeService.cs#L277-L325))
İki uçağın aynı körüğe aynı anda yanaşmasını engellemek için kurduğumuz matematiksel mantık:

$$\text{Çakışma} = (\text{Yeni.Başlangıç} < \text{Mevcut.Bitiş}) \land (\text{Yeni.Bitiş} > \text{Mevcut.Başlangıç})$$

C# Kodu:
```csharp
var hasConflict = await _context.JetBridgeAssignments.AnyAsync(a =>
    a.JetBridgeId == jetBridgeId &&
    a.Status != JetBridgeAssignmentStatus.Released &&
    start < (a.DisconnectionTime ?? a.EstimatedArrivalTime.AddHours(3)) &&
    end > a.EstimatedArrivalTime);
```
Eğer çakışma varsa sistem hata fırlatmakla kalmaz; aynı terminaldeki müsait **alternatif köprüleri** bulup kullanıcıya sunar!

---

#### 2. SLA İhlali ve Veritabanı Transaction Yönetimi ([OperationService.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Application/Services/OperationService.cs))
Bir operasyon bittiğinde hem operasyon kapanmalı hem de SLA kaydı atılmalıdır:
```csharp
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    // 1. Operasyon durumunu güncelle
    operation.Status = OperationStatus.Completed;
    
    // 2. SLA süresini hesapla ve kaydet
    var duration = DateTime.UtcNow - operation.ArrivalTime;
    // ...
    await _context.SaveChangesAsync();

    // İki işlem de sorunsuz bitti, veritabanına onayla!
    await transaction.CommitAsync();
}
catch
{
    // Bir adımda bile elektrik kesilse veya hata çıksa her şeyi eski haline al!
    await transaction.RollbackAsync();
    throw;
}
```
**Hoca Açıklıyor:** Banka havalesi gibidir. Ahmet'in hesabından para düşüp Mehmet'in hesabına geçerken sistem çökerse para buhar olmasın diye işlem iptal edilir (`Rollback`).

---

#### 3. Kriz Yönetimi & Spam Koruması ([WeatherCrisisService.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Application/Services/WeatherCrisisService.cs))
Rüzgâr eşiği (> 80 km/s) aşıldığında:
1. `_context.JetBridges` çekilir ve hepsi `JetBridgeStatus.UnderMaintenance` yapılır.
2. `_cache.RemoveAsync("jetbridges:available:...")` ile yolcuların yanlışlıkla körük rezerve etmesi önlenir.
3. `_messageBus.PublishAsync("crisis.weather.windshear", ...)` ile RabbitMQ'ya kriz mesajı atılır.
4. Yetkili `OperationsManager` ve `Admin` kullanıcılarına `Notification` oluşturulur.
5. **Spam Koruması:** `_cache.GetAsync<CrisisStatusDto>()` kontrol edilir. Kriz zaten aktifse 5 dakika sonra aynı işlemler tekrarlanıp sistem kilitlenmez!

---

## Bölüm 5: Infrastructure Katmanı — Dış Dünya, DB, Cache ve Worker

Burası motor dairesidir. Donanımlarla ve üçüncü parti sistemlerle temas eder.

### 1. [AeroPulseDbContext.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Infrastructure/Data/AeroPulseDbContext.cs) (Veritabanı Dünyası)
Entity Framework Core ile SQL tablolarını yönettiğimiz yer.
`OnModelCreating` içinde Fluent API kuralları yazdık:
```csharp
modelBuilder.Entity<JetBridge>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.BridgeNo).IsRequired().HasMaxLength(20);
    // Aynı terminalde iki tane 'Gate 1' olamaz! Benzersiz indeks:
    entity.HasIndex(e => new { e.TerminalNo, e.BridgeNo }).IsUnique();
});
```

---

### 2. [WeatherMonitorWorker.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Infrastructure/BackgroundServices/WeatherMonitorWorker.cs) (Otonom Arka Plan İşçisi)
```csharp
public class WeatherMonitorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // DİKKAT: Singleton içinde Scoped servis kullanmak için scope açıyoruz!
            using var scope = _scopeFactory.CreateScope();
            var weatherService = scope.ServiceProvider.GetRequiredService<IWeatherService>();
            var crisisService = scope.ServiceProvider.GetRequiredService<IWeatherCrisisService>();

            var weather = await weatherService.GetCurrentWeatherAsync(cityCode);
            var windKmH = weather.WindSpeed * 3.6;

            if (windKmH >= 80.0)
            {
                await crisisService.TriggerWindCrisisAsync(...);
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
```
**Hayati Mülakat Sorusu: Neden `IServiceScopeFactory`?**
`WeatherMonitorWorker` bir `BackgroundService` olduğu için uygulama boyunca sadece 1 kez yaratılır (**Singleton**). Ancak veritabanı işlemlerini yürüten `WeatherCrisisService` ve `AeroPulseDbContext` her işlem için ayrı üretilmelidir (**Scoped**). Singleton bir yapının içine doğrudan Scoped servis enjekte ederseniz bellek sızıntısı ve concurrency hataları oluşur. Bu yüzden her döngüde `CreateScope()` ile yapay bir çalışma alanı oluşturulup iş bitince bellek temizlenir.

---

### 3. [OpenWeatherService.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.Infrastructure/Services/OpenWeatherService.cs)
OpenWeatherMap API'sine HTTP isteği atar.
- **Failover / Mock Mekanizması:** API anahtarı girilmediyse veya internet koptuysa sistem çökmez; gerçekçi istatistiki dağılımlarla simülasyon havası üretir.

---

### 4. Cache & Message Bus Simülatörleri
- **`InMemoryCacheService`:** Redis'in çalışma mantığını birebir taklit eder. TTL (Time-To-Live) süresi dolan veriyi otomatik düşürür.
- **`InMemoryMessageBusService`:** RabbitMQ gibi mesajlaşma kuyruklarının mantığını simüle eder. Servisler birbirini doğrudan çağırmadan olay yayınlar (Decoupled Event-Driven Architecture).

---

## Bölüm 6: API Katmanı — Dünyaya Açılan Kapı ve Güvenlik

### 1. [Program.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.API/Program.cs) (Orkestranın Şefi)
Uygulama buradan başlar.
1. `builder.Services.AddInfrastructure(...)`: Tüm servisleri bağımlılık motoruna kaydeder.
2. `builder.Services.AddAuthentication(...)`: Gelen isteklerin yaka kartını (JWT Bearer Token) kontrol edecek güvenlik mekanizmasını kurar.
3. `app.UseCors(...)`: Angular ön yüzünün API'ye erişebilmesini sağlar (Cross-Origin Resource Sharing).
4. `app.UseAuthentication()` ve `app.UseAuthorization()`: Önce "Kimsin?" der (Authentication), sonra "Buraya girmeye yetkin var mı?" der (Authorization). Sıralama hayati önem taşır!

---

### 2. Controller Mantığı ([CrisisController.cs](file:///c:/Users/LENOVO/OneDrive/Desktop/Staj%202%20projesi/Aeropulse/src/AeroPulse.API/Controllers/CrisisController.cs))
```csharp
[ApiController]
[Route("api/crisis")]
[Authorize] // Giriş yapmamış kimse bu kapıdan geçemez!
public class CrisisController : ControllerBase
{
    [HttpPost("wind/trigger")]
    [Authorize(Roles = "Admin,OperationsManager")] // Sadece yöneticiler kriz başlatabilir!
    public async Task<IActionResult> TriggerWindCrisis([FromBody] TriggerWindCrisisRequestDto request)
    {
        var result = await _crisisService.TriggerWindCrisisAsync(...);
        return Ok(result); // HTTP 200 döner
    }
}
```

---

## Bölüm 7: Ön Yüz (Frontend) Nasıl Haberleşir?

Angular projemiz (`aeropulse-web`):
1. **Giriş:** Kullanıcı e-posta/şifre girer -> API'den JWT Token döner.
2. **Depolama:** Token tarayıcının `localStorage` alanına yazılır.
3. **HTTP Interceptor:** Angular'daki özel bir nöbetçi (Interceptor), sunucuya atılan her isteğin başlığına `Authorization: Bearer <TOKEN>` bilgisini otomatik iliştirir.
4. **Hata Yakalama:** Eğer API `401 Unauthorized` dönerse kullanıcı otomatik olarak Giriş ekranına şutlanır.

---

## Bölüm 8: Teknik Mülakatlara Hazırlık (Soru & Cevap)

Bu projeyi portfolyona koyup bir iş görüşmesine girdiğinde mülakatçının sana soracağı 5 soru ve vermen gereken profesyonel cevaplar:

#### ❓ Soru 1: "Neden N-Tier değil de Clean Architecture tercih ettiniz?"
> **Cevabın:** "Çünkü N-Tier mimaride iş kuralları veritabanına bağımlı hale gelir. Clean Architecture'da ise Dependency Inversion prensibini uyguladık. Domain ve Application katmanlarımız saf C#'tır; veritabanı veya harici API teknolojilerinden tamamen izoledir. Yarın SQLite yerine PostgreSQL'e geçsek veya RabbitMQ eklesek tek satır iş mantığı kodunu değiştirmemiz gerekmez."

#### ❓ Soru 2: "BackgroundService içinde scoped olan DbContext'i nasıl kullandınız?"
> **Cevabın:** "BackgroundService doğası gereği Singleton'dır. Doğrudan scoped bir servisi inject edersek 'Captive Dependency' hatası alırız. Bunu engellemek için `IServiceScopeFactory` kullandım. Her kontrol döngüsünde `CreateScope()` ile izole bir scope açtım, işi bitirip `Dispose` ettirerek bellek sızıntılarının önüne geçtim."

#### ❓ Soru 3: "Körük atamalarında çakışmaları (Conflict) nasıl engellediniz?"
> **Cevabın:** "Matematiksel olarak zaman aralığı kesişim formülünü (`StartA < EndB && EndA > StartB`) LINQ seviyesinde `IQueryable` olarak kurguladım. Çakışma anında HTTP 409 Conflict durum kodu dönerek aynı terminaldeki müsait alternatif köprüleri algoritma ile hesaplayıp önerdim."

#### ❓ Soru 4: "Fırtına anında sistemin spam yapmasını nasıl engellediniz?"
> **Cevabın:** "Hava durumu işçisi 5 dakikada bir çalışıyor. Eğer rüzgâr 3 saat boyunca 80 km/s üzerinde kalırsa her 5 dakikada bir personeli bildirim yağmuruna tutmamak için kriz durumunu Cache üzerinde bir state olarak sakladım. Kriz zaten aktifse bildirim ve DB güncelleme adımlarını atlayarak spam koruması sağladım."

#### ❓ Soru 5: "Uçuş operasyonlarını kapatırken veri bütünlüğünü nasıl sağladınız?"
> **Cevabın:** "Operasyon kapatma ve SLA kayıt oluşturma adımlarını `IDbContextTransaction` bloğu içerisine aldım. Adımlardan biri bile başarısız olursa `RollbackAsync` çağrılarak sistemin tutarsız bir duruma düşmesini engelledim (Atomicity)."

---

### 🎉 Son Söz
Tebrikler sevgili öğrencim! Bu projede bir Junior geliştiricinin 2 yılda karşılaşamayacağı kadar derin mimari kararlar, asenkron yapılar, kuyruk ve önbellek sistemleri ile gerçek hayat algoritmaları kodladın. Kodları okurken bu rehberi bir başvuru kaynağı olarak kullanabilirsin!
