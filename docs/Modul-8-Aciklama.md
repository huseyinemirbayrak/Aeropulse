# Modül 8: Saha Teknisyenleri İçin Flutter Mobil Uygulaması

Bu doküman, AeroPulse projesinin 8. modülü olan **Mobil Uygulama (Client)** tarafının kod mimarisini, oluşturulan dosyaların ne işe yaradığını ve arka plandaki C# API ile nasıl haberleştiğini detaylıca açıklar. 

---

## 1. Modülün Amacı ve Günlük Hayattan Benzetme

### Amacı:
AeroPulse sisteminin belkemiği olan arka plan (Backend - C#) ve ofis çalışanlarının kullandığı web ön yüzü (Angular) tamamlanmıştı. Ancak havalimanında uçak altında koşturan, körüklere bakım yapan **saha teknisyenlerinin** laptop açması mümkün değildir. Onların ceplerindeki telefondan sisteme erişip, kendilerine atanan arızaları görmeleri ve "İşi Bitir" diyerek merkezle haberleşmeleri gerekir. Bu modülün amacı, işte bu teknisyenler için basit, hızlı ve çapraz platform (hem iOS hem Android) çalışan bir mobil uç birim yazmaktır.

### Günlük Hayattan Benzetme:
Bunu kargocuların kullandığı el terminalleri (veya uygulamaları) gibi düşünebilirsiniz:
- Merkez ofis (Angular/Web) tüm kargoların durumunu izler, yönlendirme yapar.
- Ancak kargocu sokağa çıktığında elindeki telefondan (Flutter uygulaması) sadece **kendi dağıtacağı kargoları (görevleri)** görür.
- Kargoyu teslim edince "Teslim Edildi" (Resolved) tuşuna basar ve merkez sistem anında güncellenir.

---

## 2. Oluşturulan Sınıflar (Dosyalar) ve İç Yüzleri

Proje yapısı `aeropulse_mobile/lib/` klasörü içerisinde modüler olarak tasarlanmıştır.

### 1. `main.dart` (Uygulamanın Kalbi)
- **Görevi:** Uygulamanın çalışmaya başladığı (Giriş) noktasıdır. Tema ayarlarını yapar ve **Dependency Injection** (Bağımlılık Enjeksiyonu) için `Provider` altyapısını kurar.
- **Teknik Detay (Auto-Login):** Uygulama açılırken cihazın hafızasına bakar. Eğer daha önceden alınmış bir Token (`jwt_token`) varsa, kullanıcıyı tekrar şifre girmekle uğraştırmadan doğrudan "Görevlerim" sayfasına atar. Yoksa "Giriş Yap" ekranına yönlendirir.

### 2. `services/api_service.dart` (İletişim Köprüsü)
- **Görevi:** Telefon ile bizim yazdığımız C# Backend sunucusu arasındaki tüm konuşmayı (HTTP) yönetir. Postacı (Kurye) sınıfımızdır.
- **Nasıl Çalışır?**
  1. `login(email, password)`: C# API'sine POST isteği atar. Eğer başarılıysa gelen Token'ı cihazın güvenli hafızasına (`SharedPreferences`) yazar.
  2. `getMyFaults()`: Giriş yapmış kullanıcının Token'ını kasadan alır, isteğin `Header` kısmına `Authorization: Bearer <token>` olarak yapıştırır ve API'den listeyi çeker.
  3. `resolveFault(id, note)`: Teknisyen arızayı çözdüğünde, bu durumu çözüm notuyla birlikte API'ye ileterek sistemdeki arızayı kapatır.
- **İpucu:** Android emülatörler bilgisayarınızdaki (localhost) sunucuya ulaşmak için `10.0.2.2` IP adresini kullanır. iOS için ise `127.0.0.1` kullanılır.

### 3. `screens/login_screen.dart` (Güvenlik Kapısı)
- **Görevi:** Kullanıcıyı (Teknisyeni) içeri almadan önce kimliğini doğrulayan sayfadır.
- **Teknik Detay (Durum Yönetimi):** Ekranda bir e-posta ve şifre kutusu bulunur. Kullanıcı butona bastığında `_isLoading = true` yapılarak butonun yerine dönen bir yüklenme (loading) animasyonu çıkartılır. Böylece kullanıcı butona üst üste basamaz (Spam koruması). İşlem bitince durum (State) tekrar güncellenir.

### 4. `screens/tasks_screen.dart` (Teknisyenin İş Masası)
- **Görevi:** Teknisyen giriş yaptıktan sonra karşısına çıkan ana ekrandır.
- **Nasıl Çalışır?**
  1. Sayfa açılır açılmaz `initState` metodu tetiklenir ve C# API'den görevleri çekmeye başlar.
  2. Veriler gelene kadar ekranda yuvarlak bir yükleme animasyonu döner.
  3. Veriler geldiğinde ekrana bir `ListView` çizilir. Her görev, şık bir Kart (Card) tasarımıyla gösterilir.
  4. Henüz çözülmemiş arızalar Turuncu renkli tamir ikonuyla; Çözülmüş arızalar ise Yeşil renkli onay ikonuyla listelenir.
  5. Teknisyen "İşi Bitir" butonuna bastığında karşısına bir Pop-up (Dialog) penceresi çıkar. Buraya çözüm notunu (örneğin: "Körüğün tekerlek motoru değiştirildi") yazıp onayladığında API'ye haber gider ve liste anında tazelenir (Refresh).

---

## 3. Teknik İpuçları ve En İyi Uygulamalar (Best Practices)

1. **State Management (Provider):** `ApiService` gibi sürekli istek atacağımız sınıfları her sayfada `new ApiService()` diyerek yeniden oluşturmak yerine `Provider` paketini kullanarak uygulamanın en başında 1 kez oluşturduk (Singleton benzeri) ve sayfalara bellekten dağıttık. Bu ciddi bir performans ve mimari optimizasyonudur.
2. **Refresh Indicator (Kaydırarak Yenileme):** Görevler ekranında listeyi parmağınızla aşağı doğru çektiğinizde listenin yenilenmesi için `RefreshIndicator` kullandık. Bu sayede bir soket yapısı kurmaya gerek kalmadan kullanıcının isteğiyle verilerin güncellenmesini sağladık.
3. **Güvenlik (JWT):** Uygulama hiçbir zaman şifreyi cihazda tutmaz. Sadece API'nin verdiği geçici bilet olan Token'ı tutar. `Logout` butonuna basıldığında bu bilet anında imha edilir.

---

## 4. Uygulamayı Nasıl Çalıştırabilirsiniz?

Eğer bilgisayarınıza Flutter SDK'yı kurduysanız, bu kodu hayata geçirmek çok kolaydır:

1. VS Code terminalini açın ve oluşturulan mobil klasörüne girin:
   ```bash
   cd aeropulse_mobile
   ```
2. Eksik kütüphaneleri (`http`, `provider` vb.) indirin:
   ```bash
   flutter pub get
   ```
3. Bir emülatör seçin ve projeyi ayağa kaldırın:
   ```bash
   flutter run
   ```
   *(Eğer emülatör yoksa, uygulamanın web versiyonunu görmek için Edge veya Chrome'u da cihaz olarak seçebilirsiniz).*
