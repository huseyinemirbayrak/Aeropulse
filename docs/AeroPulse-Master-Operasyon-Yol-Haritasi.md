# ✈️ AeroPulse Master Operasyon & Mimarî Yol Haritası (Turnaround, OCC, Multi-Tenant, RabbitMQ)

Bu döküman; **AeroPulse** havacılık ve operasyon yönetim sisteminin eksiklerinin giderilmesi, gerçek dünya havalimanı operasyonlarına (OCC, Turnaround/Redcap, Ramp, GSE Filo, Line Maintenance, Gate Agent) uyarlanması, asenkron mesajlaşma (RabbitMQ / SignalR) ve çok kiracılı (Multi-Tenant) mimariye kavuşturulması için hazırlanan **aşamalı (adım adım) ana rehberdir.**

---

## 📌 Genel Bakış ve Rol Matrisi

| Rol / Persona | Operasyonel Kapsam | Temel Sorumluluk ve Yetkiler | İlgili Ekran / Platform |
| :--- | :--- | :--- | :--- |
| **OCC Nöbetçisi (Operasyon Kontrol)** | Havalimanı geneli kuşbakışı yönetim | Gelen/giden uçuş takibi, yaklaşan uçuşlar, pist/kapı meşguliyeti, gecikmelerde kaynak planlamasını manuel "override" etme. | Web (OCC Live Radar & Apron) |
| **Harekat Memuru (Redcap / Turnaround)** | Uçak bazlı dönüş (turnaround) yönetimi | Sorumlu olduğu uçağın yer hizmetlerini (yakıt, bagaj, ikram, temizlik) yönetme, yük/denge (loadsheet) onayı, kalkış izni (Release). | Web & Tablet (Turnaround Hub) |
| **Ramp Görevlisi / Araç Operatörü** | Saha fiziksel operasyonu | Kendine atanan iş emirlerini görme (bagaj, pushback, merdiven), durumu *"Kabul Edildi" ➔ "Başladı" ➔ "Tamamlandı"* olarak işleme. | Responsive Web (Saha / Tablet / Masaüstü) |
| **Ekipman ve Filo Yöneticisi (GSE)** | Apron yer destek araçları verimliliği | Otobüs, yakıt tankeri, traktörlerin anlık durumu (Boşta / Görevde / Bakımda) ve apron konumlarını izleme, arızalı aracı servise çekme. | Web (GSE Fleet Manager) |
| **Teknik Bakım (Line Maintenance)** | Uçak sefere elverişlilik | TechLog inceleme, arıza kayıtları, hızlı hat bakımı, teknik uçuş onayı (Technical Release). | Web (MRO Tech Panel) |
| **Yolcu Hizmetleri (Gate Agent)** | Terminal biniş (Boarding) | Uçak yolcu manifestosu, biniş sayımı, eksik yolcu bildirimi, bagaj sayım eşleştirmesi (BRS). | Web & Tablet (Gate Agent Boarding) |

---

## 🗺️ Faz 1: Anlık Düzeltmeler, Hata Giderimi & Temel Veritabanı Modelleri

> **Hedef:** Mevcut sistemdeki kırık akışları (yetkilendirme, hata yakalama, butonlar) onarmak ve operasyonel varlıklar için veritabanı şemasını genişletmek.

### 1.1. Acil Hata Düzeltmeleri
1. **Admin / Tech Panel "Submit Report" 403 Hatası:**
   - `AircraftController.cs` üzerindeki `[Authorize(Roles = "Admin,OperationsManager,MROEngineer,Viewer")]` niteliğine `FieldTechnician` rolünü eklemek.
   - `fault-form.ts` içinde `subscribe` bloğuna `error: (err) => ...` geri bildirimi eklemek; form validasyonunu dinamik hale getirmek.
2. **Dashboard Butonları ve Yönlendirmeler:**
   - Admin ve Ops Dashboard'daki pasif butonların (`refresh`, `manage operations`, `view jet bridges`, aksiyon modalları) `routerLink` ve `(click)` event bağlantılarını sağlamak.

### 1.2. Yeni Veritabanı Modelleri (Domain Katmanı)
* **`Runway` (Pist):** `Id`, `RunwayCode` (örn: 35L, 17R), `Status` (Available, LandingInProgress, TakeoffInProgress, ClosedForMaintenance), `LengthMeters`.
* **`Gate` / `Stand` (Kapı & Park Yeri):** `Id`, `GateNumber`, `TerminalCode`, `HasJetBridge`, `Status` (Available, Occupied, Reserved, Maintenance).
* **`TurnaroundTask` (Yer Hizmeti Görevi):** `Id`, `OperationId`, `TaskType` (BaggageUnload, BaggageLoad, Refueling, Cleaning, Catering, PassengerBoarding, Pushback), `Status` (Pending, Accepted, InProgress, Completed, Delayed), `AssignedUserId`, `AssignedGSEId`, `StartTime`, `EndTime`, `TargetDurationMinutes`.
* **`GroundSupportEquipment` (GSE - Apron Araçları):** `Id`, `Code` (örn: TANKER-01, BUS-03, TUG-05), `Type` (PassengerBus, FuelTanker, BaggageTug, PassengerStairs, PushbackTruck, GPU), `Status` (Idle, Busy, OutOfService), `FuelLevelPercentage`, `ApronZone`, `CurrentLatitude`, `CurrentLongitude`.
* **`PassengerManifest`:** `Id`, `OperationId`, `TotalBooked`, `BoardedCount`, `GateNo`, `BoardingStatus` (NotStarted, Boarding, FinalCall, Closed), `LuggageMatchComplete`.

---

## 🗺️ Faz 2: Operasyon Kontrol Merkezi (OCC) & Canlı Apron Dashboard

> **Hedef:** Boş olan Ops Dashboard'u, OCC nöbetçisinin havalimanını kuşbakışı yönetebileceği modern bir operasyon merkezine dönüştürmek.

### 2.1. Backend Geliştirmeleri
* **`IOccService` & `OccController`:**
  - `GET /api/occ/overview`: Yaklaşan uçuşlar (Inbound), kalkacak uçuşlar (Outbound), aktif operasyonlar, gecikme istatistikleri.
  - `GET /api/occ/runways`: Tüm pistlerin anlık boş/dolu durumu.
  - `GET /api/occ/gates`: Tüm kapı ve park yerlerinin meşguliyet durumu.
  - `POST /api/occ/override`: Uçuşun kapısını, park yerini veya saatini manuel ezme (override) ve loglama.

### 2.2. Frontend Arayüzü (`/ops/dashboard`)
* **Havalimanı Kuşbakışı Metrikleri:**
  - Canlı Pist Durum Kartları (Pist 35L: BOŞ 🟢 | Pist 35R: İNİŞTE TK1984 🟡).
  - Terminal Kapı Matrisi (Kapı A1-A12 doluluk ısı haritası).
  - Yaklaşan Uçaklar Zaman Çizelgesi (Inbound Flight Radar List).
* **Manuel Override Paneli:**
  - Geciken bir uçuşun kapısını tek tıkla boş bir körüğe/açık parka yönlendirme modalı.

---

## 🗺️ Faz 3: Turnaround Süreç Yönetimi (Redcap & Yolcu Hizmetleri)

> **Hedef:** Her uçuşun 45-60 dakikalık dönüşünü adım adım takip edilebilir ve uçuş bazında onaylanabilir hale getirmek.

### 3.1. Harekat Memuru (Redcap) Ekranı (`/ops/turnaround/:operationId`)
* **Uçuş Dönüş Kronometresi (Turnaround Countdown):**
  - Hedeflenen kalkış saatine kalan geri sayım.
  - 6 Temel Görevin Canlı Statüsü:
    1. 🧳 **Bagaj Boşaltma/Yükleme:** % tamamlanma çubuğu (örn. 142/150 bagaj yüklendi).
    2. ⛽ **Yakıt İkmali:** Hedef yakıt vs. Alınan yakıt (örn. 8.500 kg / 8.500 kg).
    3. 🧹 **Kabin Temizliği & İkram:** Tamamlandı onayı.
    4. 🚶‍♂️ **Yolcu Binişi (Boarding):** 172/180 yolcu uçakta.
    5. ⚖️ **Loadsheet (Yük/Denge Formu):** Kaptan ve Redcap tarafından onaylandı rozeti.
    6. 🚀 **Kalkış Onayı (Flight Clearance):** Kırmızı/Yeşil "Yetki Verildi" anahtarı.

### 3.2. Yolcu Hizmetleri (Gate Agent) Ekranı (`/ops/gate-agent/:operationId`)
* **Yolcu Manifestosu ve Biniş Takip Paneli:**
  - Barkod/bilet tarama simülasyonu ile yolcu sayacının artması.
  - Gelmeyen/Kayıp yolcuların listesi ve anons/arama butonu.
  - BRS (Baggage Reconciliation System): Uçağa binen yolcu ile ambarındaki bagajın eşleşme durumu (Yolcusu gelmeyen bagaj uçuştan indirilmeli kuralı).

---

## 🗺️ Faz 4: Apron Araç Filosu (GSE) & Ramp Görevlisi Entegrasyonu

> **Hedef:** Sahadaki yer araçlarının (otobüs, yakıt tankeri vb.) durumunu izlemek ve saha personeline mobil iş emri iletmek.

### 4.1. Ekipman ve Filo Yöneticisi Paneli (`/ops/gse-fleet`)
* **Araç Durum Tablosu ve Apron Konumları:**
  - **Yolcu Otobüsleri:** Otobüs-01 (Boşta / Gate B4), Otobüs-02 (Dolu - TK1821 yolcularını taşıyor), Otobüs-03 (Arızalı - Serviste).
  - **Yakıt Tankerleri:** Tanker-01 (İkmal Yapıyor / Uçak: TC-JHK), Tanker-02 (Boşta / Depo Bölgesi).
  - **Statü Değiştirme:** Arızalanan aracı "Bakımda" (Out of Service) statüsüne çekme (böylece sisteme yeni görev atanması engellenir).

### 4.2. Ramp Görevlisi Ekranı (Web & Saha Paneli)
* **İş Emri Akışı:**
  - Görev Geldi ➔ **"Kabul Et"** ➔ Başlama Saati Başlar.
  - Görev Başladı ➔ **"İşleme Al"** ➔ Konum/Sayaç işlenir.
  - Görev Bitti ➔ **"Tamamlandı"** ➔ Turnaround ekranındaki ilgili görev otomatik yeşile döner.

---

## 🗺️ Faz 5: Asenkron Mesaj Kuyrukları (RabbitMQ) & Canlı Ekrana Yansıtma (SignalR)

> **Hedef:** Uçuş durum değişikliklerinin, görev adımlarının ve araç hareketlerinin sayfa yenilenmeden tüm ekranlara saniyesinde yansıması.

### 5.1. RabbitMQ Mesajlaşma Mimarisi
* **Mesaj Tipleri:**
  - `turnaround.task.updated`: Görev tamamlandığında yayınlanır.
  - `flight.gate.override`: OCC kapı değiştirdiğinde yayınlanır.
  - `gse.status.changed`: Araç arızalandığında veya göreve çıktığında yayınlanır.
  - `boarding.progress`: Yolcu biniş sayısı her arttığında yayınlanır.
* **Worker Services (Consumer):**
  - Kuyruktan gelen mesajları işleyip veritabanına yazar ve SignalR Hub üzerinden ilgili istemcilere iletir.

### 5.2. SignalR Canlı Hub (`AeroPulseHub`)
* Tüm web istemcileri WebSocket ile bağlanır:
  - `ReceiveTurnaroundUpdate(taskDto)`
  - `ReceiveGseUpdate(gseDto)`
  - `ReceiveFlightAlert(alertMessage)`

---

## 🗺️ Faz 6: Multi-Tenant (Çok Kiracılı) Mimari Tasarımı

> **Hedef:** Farklı havayolu şirketlerinin (THY, Pegasus) ve taşeron yer hizmetlerinin (TGS, Çelebi, Havaş) verilerini izole etmek.

### 6.1. Mimari Tasarım & İzolasyon Stratejisi
* **Discriminator Column Yaklaşımı (`TenantId`):**
  - Tüm temel entity'lere `public Guid TenantId { get; set; }` ve `ITenantEntity` arayüzü eklenir.
* **EF Core Global Query Filter:**
  - `modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _currentTenantId || _isSuperAdmin);`
  - Bir havayolu şirketi kullanıcısı giriş yaptığında, diğer havayollarının uçuşlarını veya verilerini asla sorgulayamaz.
* **Tenant Middleware:**
  - Gelen HTTP isteğindeki JWT Token içerisinden `tenant_id` claim'i okunur ve scoped `TenantService` içine enjekte edilir.
* **Super-Admin / OCC (Havalimanı Otoritesi) Görünümü:**
  - Havalimanı operasyon kontrol nöbetçisi tüm kiracıların uçuşlarını apron güvenliği için tek bir ekranda (Cross-Tenant) izleme yetkisine sahiptir.

---

## 📋 Uygulama ve İlerleme Kontrol Listesi

- [x] **Faz 1:** `AircraftController` yetkileri ve `fault-form` hata düzeltmesi.
- [x] **Faz 1:** `Runway`, `Gate`, `TurnaroundTask`, `GSE`, `PassengerManifest` modelleri ve Seed datası.
- [x] **Faz 2:** OCC Canlı Dashboard ekranı (Pistler, Kapılar, Yaklaşan Uçaklar, Manuel Override).
- [x] **Faz 3:** Redcap Turnaround Gantt/Zaman Çizelgesi ve Loadsheet onay akışı.
- [x] **Faz 3:** Gate Agent Yolcu Manifestosu ve Boarding BRS takibi.
- [x] **Faz 4:** GSE Apron Araç Filosu Yönetimi (Otobüs & Tanker durumları, arıza statüsü).
- [x] **Faz 4:** Ramp Görevlisi iş emri (Kabul -> Başlat -> Tamamla) akışı.
- [x] **Faz 6:** Multi-Tenant mimari (TenantId, EF Core Global Filter, JWT Claim / X-Tenant-ID Header & Frontend Switcher).
