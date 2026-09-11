# AeroPulse: Yeni Nesil Havalimanı Operasyon ve Kriz Yönetim Sistemi
**Staj Sunum ve Detaylı Proje Analiz Dokümanı**

---

## 1. GİRİŞ VE PROJENİN AMACI

**AeroPulse**, karmaşık ve saniyelerin bile önemli olduğu havalimanı operasyonlarını dijitalleştiren, uçak yanaşma (körük) planlamalarından periyodik bakımlara, anlık hava durumu krizlerinden uçuş gecikmelerine kadar tüm süreçleri otonom ve merkezi bir şekilde yönetmeyi hedefleyen kapsamlı bir yazılım sistemidir.

Bu projenin temel amacı; insan hatasını (human-error) en aza indirmek, departmanlar arası (Operasyon Yöneticisi, Saha Teknisyeni, Kule) iletişimi hızlandırmak ve acil durumlarda sistemin "yapay bir zeka" gibi kendi kendine karar alabilmesini (Otonom Kriz Yönetimi) sağlamaktır.

---

## 2. KULLANILAN TEKNOLOJİLER VE MİMARİ (TECH STACK)

Proje, günümüz yazılım endüstrisinin standartları olan **"Kurumsal (Enterprise)"** teknolojiler ve mimariler üzerine inşa edilmiştir.

### 2.1. Mimari Yaklaşım
- **Clean Architecture (Temiz Mimari):** Proje 4 ana katmana bölünmüştür (`Domain`, `Application`, `Infrastructure`, `API`). Bu sayede veritabanı veya arayüz değişiklikleri, sistemin çekirdek iş mantığını (Business Logic) asla etkilemez. Gevşek bağlı (Loosely Coupled) bir yapı kurulmuştur.
- **Dependency Injection (Bağımlılık Enjeksiyonu):** Sınıflar birbirine doğrudan `new` anahtar kelimesiyle bağlanmak yerine (Tight Coupling), .NET Core'un yerleşik IoC (Inversion of Control) konteyneri ile arayüzler (`Interfaces`) üzerinden haberleşir.

### 2.2. Backend (Arka Plan) Teknolojileri
- **.NET 8/10 (C#):** API'nin çekirdek dil ve framework'ü.
- **Entity Framework Core:** Veritabanı işlemleri (ORM - Object Relational Mapping) için.
- **JWT (JSON Web Token):** Kimlik doğrulama (Authentication) ve rol bazlı yetkilendirme (Admin, OperationsManager, Technician) için.
- **Redis (Cache):** Sık okunan verilerin (boş körükler, kriz durumu vb.) veritabanını yormadan milisaniyeler içinde getirilmesi için.
- **RabbitMQ (Message Broker):** Mikroservis mimarilerine hazırlık olarak, kriz anlarında sistemler arası asenkron mesaj ve olay (Event) fırlatmak için.
- **Background Services (.NET Hosted Services):** Arka planda 7/24 uyumadan çalışan ve dış API'leri dinleyen otonom işçiler.

### 2.3. Frontend (Ön Yüz) Teknolojileri
- **Angular (TypeScript):** Ofis personeli ve yöneticiler için geliştirilen modern, bileşen (Component) bazlı web arayüzü.
- **Angular Material & Modern CSS:** Şık, tepkisel (Responsive) ve kullanıcı dostu bir Dashboard (Yönetim Paneli) tasarımı.
- **Responsive Web & Tablet Saha Arayüzü (Angular):** Saha teknisyenleri ve ramp görevlilerinin el terminalleri ve tabletlerinden doğrudan erişebileceği dokunmatik saha panelleri.

---

## 3. PROJE KAPSAMI VE MODÜLLER

Proje, havalimanı yönetiminin farklı ihtiyaçlarını karşılayan 5 temel modülden oluşur:

### Modül 1: Uçak ve Filo Yönetimi (Aircraft Management)
- Havayolu şirketlerine ait uçakların kuyruk numarası, model, kapasite ve güncel statüleriyle (Uçuşta, Yerde, Bakımda vb.) sisteme kaydedilmesi.
- Verilerin sayfalama (Pagination) ve filtreleme özellikleri ile yönetilmesi.

### Modül 2: Yolcu Köprüsü (Körük / Jet Bridge) Yönetimi
- Havalimanındaki tüm yolcu köprülerinin anlık durumlarının (Müsait, Dolu, Bakımda, Kapalı) izlenmesi.
- İnen bir uçağın hangi körüğe yanaşacağının planlanması ve kayıt altına alınması. 
- Körüklerin statülerinin Redis ile saniyeler içinde güncellenip önbellekte tutulması.

### Modül 3: Bakım ve Arıza Yönetimi (Maintenance & Fault Reports)
- Uçakların periyodik bakımlarının planlanması (Scheduled Maintenance).
- Sahada tespit edilen arızaların "Fault Report" (Arıza Kaydı) olarak sisteme girilmesi ve önem derecesine (Düşük, Orta, Acil) göre sınıflandırılması.
- Arızaların teknisyenlere atanması ve süreç takibi.

### Modül 4: Akıllı Kriz ve Otonom Güvenlik Yönetimi (Senaryo 1: Hava Durumu)
*Bu modül projenin en "Akıllı" ve yenilikçi (inovatif) kısmıdır.*
- **OpenWeather API Entegrasyonu:** Sistem, bulunduğu havalimanının hava durumunu dış bir kaynaktan sürekli çeker.
- **Otonom Kapanma:** Rüzgar hızı saniyede 80 km'yi (Eşik değer) aşarsa, `WeatherMonitorWorker` isimli arka plan servisi insan müdahalesi beklemeden "Kriz (Windshear)" ilan eder.
- **Otomatik Aksiyonlar:** Kriz anında devrilme riskine karşı tüm boş körükler sistem üzerinden "Kullanım Dışı (UnderMaintenance)" durumuna çekilir, önbellekler temizlenir, RabbitMQ üzerinden acil durum mesajı fırlatılır ve tüm Operasyon Yöneticilerine anlık bildirim gider.
- Fırtına dindiğinde sistem kendi kendine normale döner ve körükleri tekrar kullanıma açar.

### Modül 5: Uçuş Gecikme Analizi ve SLA İhlal Uyarıları (Senaryo 2)
*Gelişmiş operasyonel risk analizi.*
- Dış radarlardan (veya webhook'lardan) gelen "Uçak X, 180 dakika rötarlı inecek" bilgisini anında analiz eder.
- Sistemin o günkü takvimine bakar. Eğer geciken uçak için rezerve edilmiş bir bakım ekibi varsa ve uçağın yeni geliş saati bakım ekibinin vardiyasını taşıyorsa (SLA İhlali) anında **Yüksek Öncelikli Kriz Raporu** oluşturur.
- Eğer 1 saatten fazla gecikme varsa ve körük rezervasyonu başka uçaklarla çakışacaksa, yine Operasyon Yöneticisini "Körük Rezervasyonu Tehlikede!" diyerek sistem üzerinden uyarır.

### Modül 6: Saha Teknisyenleri ve Ramp Görevlileri İçin Saha Paneli (Web/Tablet)
- Saha personelinin apron üzerinde el terminalleri veya tabletlerle aktif iş emirlerini kabul etmesi, arıza bildirmesi ve görevleri tamamlaması.
- Teknisyenin üzerine atanan arızaları anında görmesi ve durumu "İnceleniyor / Çözüldü" olarak güncellemesi.

---

## 4. PROJENİN ŞİRKETE / SEKTÖRE SAĞLAYACAĞI FAYDALAR

1. **Sıfır İletişim Hatası:** Telsiz anonsları veya telefon trafiği yerine tüm emirlerin merkezi sistemden otomatik ve anlık iletilmesi.
2. **Otonom Emniyet:** Şiddetli hava koşullarında insanın panikleyip unutabileceği güvenlik adımlarının (körüklerin toplanması vb.) yazılım tarafından saniyeler içinde otonom yürütülmesi.
3. **Kağıtsız Operasyon (Paperless):** Teknisyenlerin ve ramp görevlilerinin kağıt formlarla dolaşması yerine tablet/el terminali arayüzüyle işleri dijitalde çözmesi süreçleri saatlerden saniyelere indirir.
4. **Ölçeklenebilirlik:** Clean Architecture, Redis ve RabbitMQ altyapıları sayesinde bu sistem sadece bir havalimanı için değil, aynı anda onlarca farklı havalimanının verisini kasmadan (darboğaza girmeden) yönetecek güce sahiptir.

---

## 5. SONUÇ

**AeroPulse**; modern yazılım mimarisi kurallarının harfiyen uygulandığı, asenkron iletişim, önbellekleme, rol bazlı güvenlik, arka plan otonom işçileri ve çoklu platform (Web + Mobil) desteği gibi üst düzey özellikleri bünyesinde barındıran eksiksiz bir üründür. 

Bu staj projesi, salt kod yazmanın ötesinde **"Bir sistem nasıl tasarlanır, acil durumlar kodla nasıl çözülür ve performans nasıl optimize edilir?"** sorularının uygulamalı, profesyonel bir yanıtıdır.
