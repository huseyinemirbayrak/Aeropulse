# Modül 1 — Temel Altyapı & Kimlik Doğrulama (Foundation & Authentication)

Bu döküman, **AeroPulse** projesinin ilk modülü olan temel altyapı ve kimlik doğrulama sistemini, yazılıma yeni başlayan birinin anlayabileceği şekilde, adım adım açıklamaktadır.

---

## 1. Bu Modülde Hangi Class'lar Oluşturuldu ve Ne İşe Yararlar?

Bu modül sistemin kalbidir. Sisteme kimlerin girebileceğini, hangi yetkilere sahip olacaklarını ve temel veri tabanı ayarlarını barındırır.

### `User` (Kullanıcı) Sınıfı
- **Ne İşe Yarar?** Sistemdeki her bir personeli (Admin, Operasyon Sorumlusu, Bakım Mühendisi vs.) temsil eder. Bunu şirketin İnsan Kaynakları sistemindeki bir "Personel Dosyası" gibi düşünebilirsiniz.
- **Özellikleri (Attribute'lar):**
  - `Id` (Guid): Personelin TC Kimlik No'su gibi eşsiz bir tanımlayıcı.
  - `FullName` (string): Personelin tam adı ve soyadı.
  - `Email` (string): Sisteme giriş yaparken kullanılacak e-posta adresi.
  - `PasswordHash` (string): Parolanın güvenli bir şekilde şifrelenmiş (hashlenmiş) hali. Asla düz metin olarak tutulmaz.
  - `Role` (UserRole enum): Personelin sistemdeki rolü (Örn: Admin, MRO Engineer). Bu, çalışanın giriş kartındaki "Yetki Seviyesi" gibidir.
  - `IsActive` (bool): Hesabın aktif olup olmadığını belirtir. Biri işten ayrıldığında hesabı silmek yerine bu değeri "false" (pasif) yaparız.

### `UserRole` (Kullanıcı Rolü) Enum (Numaralandırma)
- **Ne İşe Yarar?** Sistemdeki sabit rolleri tanımlar. Sabit bir listedir (Admin, OperationsManager, vb.). Sadece bu listedeki rollerden biri seçilebilir.

### `IAuthService` ve `AuthService`
- **Ne İşe Yarar?** Kapıdaki "Güvenlik Görevlisi"dir. `IAuthService` güvenlik görevlisinin yapması gereken kuralları (giriş yap, kayıt ol) belirlerken, `AuthService` bu kuralların nasıl uygulanacağını yazar. İçerisinde giriş işlemlerini ve JWT (JSON Web Token - Dijital Yaka Kartı) oluşturma işlerini barındırır.

### `JwtService`
- **Ne İşe Yarar?** Kullanıcı adı ve şifresini doğru giren personele verilen "Geçici Yaka Kartı"nı basan makinedir. Bu kart (token) sayesinden sistem, sonraki her istekte "Bu kişi gerçekten yetkili mi?" diye veritabanına sormak yerine sadece kartı kontrol eder.

### `AeroPulseDbContext`
- **Ne İşe Yarar?** Projemizin veri tabanı ile haberleşmesini sağlayan ana "Köprü" veya "Klasör Odası"dır. Uygulamadaki `User`, `Aircraft` gibi nesneleri, SQL veritabanındaki tablolara dönüştürür.

---

## 2. Metotlar (Methodlar) Ne Yapıyor?

`AuthService` içindeki temel işlevlere (metotlara) bakalım:

### `LoginAsync(LoginRequestDto request)`
- **Ne Yapar?** Kullanıcının verdiği e-posta ve şifre ile sisteme giriş yapıp yapamayacağını kontrol eder.
- **Nasıl Çalışır?**
  1. Veritabanından e-postaya sahip kullanıcıyı bulur.
  2. Şifreyi kontrol eder. Şifre doğru mu?
  3. Doğruysa `JwtService`'e gidip bir bilet (token) hazırlatır.
  4. Başarı durumunu ve bileti geri döndürür.
- **Ne Döndürür?** Giriş başarılıysa bir Token (şifreli metin) ve kullanıcının bilgilerini, başarısızsa hata mesajı.

### `RegisterAsync(RegisterRequestDto request)`
- **Ne Yapar?** Sisteme yeni bir personel ekler. Sadece "Admin" yetkisi olanlar çağırabilir.
- **Nasıl Çalışır?**
  1. E-posta zaten kayıtlı mı diye bakar.
  2. Değilse yeni bir `User` nesnesi yaratır, şifresini karıştırır (hash'ler).
  3. Veritabanına kaydeder.

---

## 3. Diğer Modüllerle Bağlantısı

Modül 1, diğer **bütün modüllerin** temelidir. 
- Modül 2'de uçaklara bakım yapacak kişinin yetkili bir MRO Mühendisi olup olmadığını Modül 1'in verdiği "Dijital Yaka Kartı" (JWT Token) ile anlarız.
- Modül 3'te bir uçuş gecikmesi raporlanırken, "Bu işlemi kim yaptı?" sorusunun cevabı, yine giriş yapmış olan `User` nesnesinden gelir.

---

## 4. Nasıl Test Edilir? (Postman/Swagger)

Backend çalıştığında `http://localhost:5146/swagger` adresine girin.

### Senaryo 1: Giriş Yapmak (Login)
1. Swagger'da `POST /api/Auth/login` sekmesini açın.
2. `Try it out` diyerek şu JSON verisini girin (DataSeeder tarafından hazırlandı):
   ```json
   {
     "email": "admin@aeropulse.com",
     "password": "Admin123!"
   }
   ```
3. `Execute`'a basın.
4. Cevap (Response) kısmında `token` isimli uzun bir şifreli metin göreceksiniz. Bu sizin yaka kartınızdır.

### Senaryo 2: Yetkili Bir İşlem Yapmak
1. Yukarıda aldığınız `token` değerini kopyalayın.
2. Swagger'ın en üstündeki `Authorize` (kilit simgesi) butonuna tıklayın.
3. Kutucuğa `Bearer BURAYA_TOKEN_YAPISTIRIN` yazıp onaylayın.
4. Artık kilitli olan (örneğin uçak ekleme) işlemleri deneyebilirsiniz. Eğer token girmezseniz veya süresi dolarsa API size `401 Unauthorized` (Yetkisiz) hatası verecektir.
