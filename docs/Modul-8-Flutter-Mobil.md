# Modül 8: Saha Teknisyenleri İçin Temel Flutter Mobil Uygulaması

Bu döküman, AeroPulse projesinin saha teknisyenleri (Field Technicians) için kullanılacak olan, çok temel (basic) bir **Flutter Mobil Uygulaması** geliştirmek için yapmanız gerekenleri adım adım anlatmaktadır.

---

## 1. Neden Mobil Uygulama?

Web uygulaması (Angular) ofiste oturan yöneticiler (Admin, Operasyon Yöneticisi) için harikadır. Ancak sahada (uçak altında veya körükte) koşturan bir teknisyenin laptop açması zordur. Teknisyenin cep telefonundan:
- Kendisine atanan arızaları görmesi,
- Arızayı "Çözüldü" olarak işaretlemesi,
- *(İsteğe Bağlı)* Arızanın fotoğrafını çekip sisteme yüklemesi gerekir.

Bu yüzden **Flutter** kullanarak hem iOS hem de Android için tek kodla çalışan basit bir uygulama tasarlayacağız.

---

## 2. Kurulum ve Başlangıç

Eğer bilgisayarında Flutter kurulu değilse:
1. [Flutter Resmi Sitesi](https://docs.flutter.dev/get-started/install)'nden SDK'yı indir.
2. VS Code'a **Flutter** ve **Dart** eklentilerini kur.

Projeyi oluşturmak için terminalde (AeroPulse klasörünün dışındayken veya kök dizinindeyken) şu komutu çalıştır:
\`\`\`bash
flutter create aeropulse_mobile
\`\`\`
Bu komut sana içi dolu, "sayaca (counter) basınca artan" hazır bir taslak proje verecektir.

---

## 3. Mimari ve Eklenecek Paketler (Dependencies)

Flutter projesindeki `pubspec.yaml` dosyasına şu kütüphaneleri eklemelisin:

- **`http:`** (Backend C# API'mize istek atmak için - GET/POST vb.)
- **`shared_preferences:`** (Kullanıcı giriş yaptığında aldığımız JWT Token'ı telefona kaydetmek için, böylece uygulamayı her açtığında şifre sormaz.)
- **`provider:`** veya **`bloc:`** (Basit tutmak için State Management olarak Provider seçebilirsin.)

Komut satırından kurulum:
\`\`\`bash
flutter pub add http shared_preferences provider
\`\`\`

---

## 4. Uygulamadaki Temel Ekranlar (Sayfalar)

Çok "basic" bir uygulamada sadece 2 ana ekrana ihtiyacımız var:

### Ekran 1: Giriş Sayfası (Login Screen)
**Amacı:** Teknisyenin sisteme girmesi.
- **Tasarım:** E-posta, Şifre kutucukları ve "Giriş Yap" butonu.
- **Arka Plan:** Butona basıldığında Flutter, senin C# API'ndeki `POST /api/Auth/login` adresine istek atar.
- **Sonuç:** Eğer başarılıysa, API'den gelen `token` değeri `shared_preferences` ile telefona kaydedilir ve 2. ekrana geçilir.

### Ekran 2: Görevlerim Sayfası (My Faults / Tasks List)
**Amacı:** Teknisyenin kendine atanan arızaları liste halinde görmesi.
- **Tasarım:** Alt alta dizilmiş kartlar (ListView). Her kartta arızanın başlığı, tarihi ve durumu yazar.
- **Arka Plan:** Sayfa açılırken Flutter, `GET /api/fault-reports/my-faults` adresine istek atar (İsteğin `Header` kısmına Login'den aldığı `token`'ı koymayı unutma!).
- **Etkileşim:** Bir arızaya tıklandığında bir "Detay" penceresi (Dialog) açılır ve orada "İşi Bitir (Resolve)" adında bir buton olur. Bu butona basılınca `PUT /api/fault-reports/{id}` ile durum "Çözüldü"ye çekilir.

---

## 5. API Bağlantısı İçin Önemli Not (CORS ve Localhost)

Mobil emülatörden bilgisayarındaki C# API'ye (`localhost:5146`) istek atarken:
- **Android Emülatör kullanıyorsan:** `localhost` yerine `10.0.2.2:5146` adresini kullanman gerekir (Android emülatörü bilgisayarın localhost'unu böyle görür).
- **iOS Simülatör kullanıyorsan:** `localhost:5146` veya `127.0.0.1:5146` çalışır.

### Örnek API İstek Kodu (Dart):

\`\`\`dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

Future<List<dynamic>> fetchMyFaults() async {
  final prefs = await SharedPreferences.getInstance();
  final String? token = prefs.getString('jwt_token');

  final response = await http.get(
    Uri.parse('http://10.0.2.2:5146/api/fault-reports/my-faults'), // Android için
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token', // Güvenlik kapısından geçiş
    },
  );

  if (response.statusCode == 200) {
    return jsonDecode(response.body)['data'];
  } else {
    throw Exception('Görevler yüklenemedi.');
  }
}
\`\`\`

## Sonuç
Bu adımları izleyerek teknisyenlerin sahada kullanabileceği oldukça pratik ve AeroPulse sisteminin değerini katlayacak bir mobil uç (client) yazabilirsin!
