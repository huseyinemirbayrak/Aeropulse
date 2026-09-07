# AeroPulse: Kapsamlı Teknik Analiz ve Karar Raporu (Technical Architecture & Decision Log)

Bu doküman, AeroPulse projesinin geliştirilmesi sırasında alınan mimari kararları, tercih edilen tasarım desenlerini, kullanılan teknolojilerin *neden* ve *nasıl* seçildiğini mühendislik perspektifinden derinlemesine incelemektedir.

---

## 1. MİMARİ KARARLAR (ARCHITECTURAL DECISIONS)

### 1.1. Neden "Clean Architecture" Tercih Edildi?
Geleneksel "N-Tier" (3 Katmanlı) mimarilerde genellikle İş Mantığı (Business Logic) katmanı doğrudan Veritabanı (Data Access) katmanına bağımlıdır. Bu durum, ileride veritabanı teknolojisi (örneğin SQL Server'dan PostgreSQL'e) değiştirilmek istendiğinde tüm kodun çökmesine neden olur.
- **Karar:** Sistemi `Domain`, `Application`, `Infrastructure` ve `API` olmak üzere 4 ana katmana böldük. Bağımlılık yönü her zaman **dıştan içe (Domain'e)** doğru tasarlandı.
- **Nasıl Uygulandı?** Uygulamanın kalbi olan `Application` katmanında sadece `Interface` (Arayüz) tanımlamaları yaptık (`IMaintenanceService` gibi). Bu arayüzlerin içini dolduran gerçek sınıfları (`MaintenanceService`) ise `Infrastructure` katmanında yazdık. Böylece İş Mantığı, veritabanının nasıl çalıştığıyla hiç ilgilenmedi, sadece kuralları işletti.

### 1.2. Neden Monolith Yerine "Mikroservise Hazır" Bir Yapı Kuruldu?
Proje şu an tek bir Solution altında (`AeroPulse.API`) çalışıyor olsa da (Monolithic), ileride kolayca Mikroservis mimarisine bölünebilecek şekilde tasarlandı.
- **Karar:** Servisler arası doğrudan bağ kurmak (Tight Coupling) yerine olay güdümlü (Event-Driven) haberleşmeye altyapı hazırladık.
- **Nasıl Uygulandı?** Modül 7'deki `WeatherCrisisService` fırtına çıktığında diğer servisleri direkt çağırmak yerine, **RabbitMQ (Message Broker)** üzerinden `crisis.weather.windshear` isimli bir olay (Event) fırlattı. Bildirim servisi (NotificationService) bu mesajı dinleyip kendi kendine aksiyon aldı.

---

## 2. TASARIM DESENLERİ VE PRENSİPLER (DESIGN PATTERNS)

### 2.1. Dependency Injection (Bağımlılık Enjeksiyonu)
- **Neden?** Sınıfların içinde `new` anahtar kelimesini kullanmak (örneğin `var db = new DbContext()`), kodun o sınıfa sıkı sıkıya bağlanmasına ve ileride Test (Mocking) yapılamamasına neden olur.
- **Nasıl Uygulandı?** `Program.cs` ve `DependencyInjection.cs` dosyalarında tüm servisler `.AddScoped()`, `.AddTransient()` veya `.AddSingleton()` ile .NET'in IoC (Inversion of Control) konteynerine kaydedildi. `Controller` veya `Service` sınıfları sadece yapıcı metotlarında (Constructor) `IJetBridgeService` talep etti, .NET onlara arka planda doğru sınıfı verdi.

### 2.2. Fail-Fast (Erken Başarısızlık) Prensibi
- **Neden?** Hatalı veya kötü niyetli gelen bir isteğin sistemin derinliklerine (veritabanına kadar) inmesi performans kaybına ve güvenlik açığına yol açar.
- **Nasıl Uygulandı?** `FlightEventProcessorService` içerisinde dışarıdan gelen uçak ID'si doğrudan veritabanında aranmadı. Önce `Guid.TryParse(aircraftId)` ile "Bu gerçekten geçerli bir ID mi?" diye kontrol edildi. Geçersizse, kod daha 2. satırda `return` edilerek durduruldu (Fail-Fast).

---

## 3. PERFORMANS VE ÖLÇEKLENEBİLİRLİK (PERFORMANCE & SCALABILITY)

### 3.1. Önbellekleme (Caching) Yaklaşımı
- **Neden?** Havalimanında körüklerin durumu (Boş/Dolu) uçaklar ve kule tarafından saniyede onlarca kez sorgulanabilir. Her sorguda SQL veritabanına gitmek darboğaz (Bottleneck) yaratır.
- **Nasıl Uygulandı?** `Redis` (veya IDistributedCache) kullanılarak `jetbridges:available` gibi anahtarlarla veriler hafızada (RAM) tutuldu. Sadece bir uçak yanaştığında veya kriz durumunda bu cache "Invalidate" (temizlendi) edildi.

### 3.2. Asenkron Arka Plan İşçileri (Background Services)
- **Neden?** Hava durumunu 5 dakikada bir kontrol etmek için kullanıcıdan (veya frontend'den) bir istek gelmesini bekleyemeyiz. Sistem kendi kendine çalışmalıdır.
- **Nasıl Uygulandı?** .NET'in yerleşik `IHostedService` (BackgroundService) altyapısı kullanılarak `WeatherMonitorWorker` yazıldı. Bu işçi, API'nin ana kanalını (Main Thread) meşgul etmemek için tamamen asenkron (`async/await`) çalışır ve 7/24 arkada döner.

---

## 4. İŞ MANTIĞI VE ALGORİTMİK KARARLAR (BUSINESS LOGIC)

### 4.1. "Spam" (Aşırı Bildirim) Koruması
- **Problem:** Rüzgar 80 km/s'i aştığında sistem alarm veriyor. Ancak fırtına 5 saat sürerse ve arka plan işçisi her 5 dakikada bir kontrol ediyorsa, Operasyon Yöneticisinin telefonuna 60 tane "Kriz Çıktı!" bildirimi gider. Bu sistemin ciddiyetini bozar.
- **Çözüm (Nasıl İmplamente Edildi?):** Kriz tetiklendiği an, Cache'e (veya veritabanına) `isCrisisActive = true` bayrağı asıldı. İşçi 5 dakika sonra rüzgarı tekrar yüksek gördüğünde bu bayrağa bakar. Eğer bayrak zaten açıksa işlemi es geçer (Skip). Kriz bitip rüzgar düştüğünde bayrak indirilir.

### 4.2. SLA İhlal Mantığı (180 ve 60 Dakika Kuralları)
- **Problem:** Uçağın rötar yapması tek başına bir kriz değildir. Ancak bu rötarın "planlı" diğer işleri bozup bozmayacağını kestirmek gerekir.
- **Çözüm (Nasıl İmplamente Edildi?):** `FlightEventProcessorService` içerisinde 2 aşamalı bir sorgu yazıldı:
  1. Geciken uçağın **bugün** için atanan bir bakımı var mı? Varsa ve gecikme 3 saati (180 dk) geçiyorsa (çünkü bakım ekiplerinin vardiyası 8 saattir ve 3 saatlik sapma işi yarına sarkıtır) "SLA İhlali" raporu oluşturuldu.
  2. Geciken uçağın beklediği bir körük var mı? Körük trafiği çok sıktır. Uçak 1 saat (60 dk) bile gecikse o körüğü bekleyen arkadaki uçak havada tur atmak zorunda kalır. Bu yüzden 60 dakika gecikmede "Körük Rezervasyonu Tehlikede" raporu açıldı.

---

## 5. GÜVENLİK (SECURITY)

### 5.1. Neden Cookie/Session Yerine JWT (JSON Web Token) Kullanıldı?
- **Neden?** Session tabanlı sistemlerde (SessionState), sunucu giriş yapan her kullanıcının kimliğini hafızasında (RAM) tutar. Uygulama büyüyüp 3 farklı sunucuya (Load Balancer ile) dağıldığında, 1. sunucuya giriş yapan kullanıcı 2. sunucuya düştüğünde sistemden atılır.
- **Nasıl Uygulandı?** Stateless (Durumsuz) bir mimari olan **JWT** kullanıldı. Sunucu kimseye hafızasında yer ayırmaz. Giriş yapana şifreli bir bilet (Token) verir. Token'ın içinde kişinin Rolü (Admin, Technician) şifreli olarak yazar. API sadece bu token'ın imzasını (Secret Key ile) doğrular. Bu sayede API sınırsız yatay büyüme (Horizontal Scaling) kapasitesine ulaştı.

---

## 6. SONUÇ: "ENTERPRISE" (KURUMSAL) BAKIŞ AÇISI

AeroPulse projesinin geliştirilme aşamasında yazılan hiçbir kod satırı tesadüfi değildir. Her satır kod; "Bu veri çok büyürse sistem çöker mi?", "Bu fonksiyona kötü niyetli biri garip veriler yollarsa ne olur?", "İleride veritabanını değiştirmek istersek başımız ne kadar ağrır?" soruları sorularak, **Büyük Veri ve Kurumsal Güvenlik** mühendisliği standartlarıyla yazılmıştır.
