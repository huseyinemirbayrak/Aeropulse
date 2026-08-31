# Modül 2 — Uçak Bakım (MRO) ve Parça Envanteri

Bu döküman, **AeroPulse** projesinin ikinci modülü olan Uçak, Parça Envanteri ve Bakım Kayıtları sistemini açıklamaktadır.

---

## 1. Bu Modülde Hangi Class'lar Oluşturuldu ve Ne İşe Yararlar?

Bu modül havalimanındaki uçakların ve o uçaklara takılan parçaların yönetildiği "Garaj ve Yedek Parça Deposu" gibidir.

### `Aircraft` (Uçak) Sınıfı
- **Ne İşe Yarar?** Filomuzdaki her bir uçağı temsil eder. Bir "Araç Ruhsatı" gibi düşünebilirsiniz.
- **Özellikleri (Attribute'lar):**
  - `TailNumber` (Kuyruk Numarası): Örn: "TC-JGL". Uçağın plakasıdır. Benzersiz olmak zorundadır.
  - `Model`: Örn: "Boeing 737-800".
  - `StatusCode` (Uçak Durumu): Uçak şu an aktif uçuyor mu (`Active`), hangarda bakımda mı (`InMaintenance`), yoksa yerde arızalı mı bekliyor (`Grounded`).
  - `TotalFlightHours`: Uçağın havada kaldığı toplam süre. Uçağın eskime payını ve ne zaman bakıma gireceğini hesaplamak için kullanılır.

### `Part` (Parça) Sınıfı
- **Ne İşe Yarar?** Uçağın üzerindeki motor, iniş takımı, radar gibi kritik yedek parçaları temsil eder. "Araba lastiği veya aküsü" gibi düşünebilirsiniz; belli bir ömrü vardır ve eskiyince değişmelidir.
- **Özellikleri:**
  - `PartNumber`: Üreticinin verdiği parça seri numarası.
  - `LifeSpanHours`: Parçanın fabrikasyon ömrü (örneğin 5000 saat).
  - `UsedHours`: Parçanın kaç saattir kullanıldığı.
  - `CriticalThresholdHours`: Parçanın ömrü dolmaya yaklaştığında, bizi uyarması gereken kritik saat sınırı (örneğin kullanım 4500 saati geçince haber ver).
  - `IsCritical` (Hesaplanmış Alan): `UsedHours >= CriticalThresholdHours` ise otomatik `true` (evet, kritik) döner.

### `MaintenanceRecord` (Bakım Kaydı) Sınıfı
- **Ne İşe Yarar?** Uçağa veya parçaya yapılan her bir tamir, bakım veya değişimin tutulduğu "Servis Defteri"dir.
- **Özellikleri:**
  - `WorkPerformed`: Yapılan işin detayı (örn: "Sol motor yağı değiştirildi").
  - `EngineerId`: İşlemi yapan mühendisin (Modül 1'deki `User`) kimliği.
  - `NextScheduledDate`: Bir sonraki periyodik bakımın ne zaman yapılması gerektiği.

---

## 2. Metotlar (Methodlar) Ne Yapıyor?

`PartService` (Parça Servisi) içindeki kritik bir fonksiyona bakalım:

### `GetCriticalAlertsAsync()`
- **Ne Yapar?** Depodaki tüm parçaları tarar ve ömrünün sonuna yaklaşmış (kritik eşiği geçmiş) parçaların acil listesini getirir.
- **Nasıl Çalışır?**
  1. Veritabanına gider: "Bana kullanım saati (`UsedHours`), kritik eşiğine (`CriticalThresholdHours`) eşit veya ondan büyük olan bütün parçaları getir."
  2. Parçaların hangi uçağa ait olduğunu da (TailNumber) listeye ekler.
  3. Listeyi Admin veya Bakım Mühendisi paneline gönderir.
- **Ne Zaman Çağrılır?** Ana kontrol panelindeki (Dashboard) "Kritik Uyarılar" kısmı yüklenirken her seferinde çağrılır.

---

## 3. Diğer Modüllerle Bağlantısı

- **Modül 1 İle Bağlantısı:** Bakım kayıtları girilirken (`MaintenanceRecord`), bakımı yapan mühendisin yetkisini ve adını Modül 1'in kimlik doğrulama sisteminden alırız.
- **Modül 5 İle Bağlantısı (İleride):** Buradaki kritik uyarılar (eskiyen parçalar) veya bakıma giren uçaklar (`InMaintenance` durumu), Modül 5'teki Ana Kontrol Merkezi (Dashboard) ekranında kırmızı alarmlar olarak gösterilecektir.

---

## 4. Nasıl Test Edilir? (Postman/Swagger)

Swagger (`http://localhost:5146/swagger`) üzerinden test etmek için:

### Senaryo 1: Kritik Parçaları Listelemek
1. Önce Modül 1'deki gibi bir MRO Mühendisi (veya Admin) hesabı ile `Login` olup `token` alın.
2. Swagger'ın sağ üstünden `Authorize` butonuna basıp token'ı (`Bearer ...`) girin.
3. `Parts` (Parçalar) menüsü altındaki `GET /api/Parts/critical-alerts` sekmesini açın.
4. `Try it out` ve `Execute` diyerek işlemi çalıştırın.
5. Cevap olarak ömrü bitmek üzere olan parçaların listesini (örneğin "Left Engine - CFM56") ve takılı olduğu uçakları göreceksiniz.
