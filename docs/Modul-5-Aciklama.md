# Modül 5: Angular Ön Yüz (Frontend) Entegrasyonu

## Amacı
Arka planda (Backend'de) çalışan karmaşık iş kurallarını (iş süreçleri, SLA hesaplamaları vb.), son kullanıcıya (Yönetici, Mühendis, Teknisyen) kolay kullanılabilir ve güzel görünümlü bir arayüz ile sunmak.

## Teknik Bileşenler

1. **`core/api.service.ts`**
   - *Benzetme:* Çevirmen veya Elçi.
   - *Görev:* Kullanıcının ekranda tıkladığı butonları veya girdiği formları alır, C# tarafının (Backend) anlayacağı şekle çevirip internet üzerinden (HTTP) gönderir. Sonuç gelince de ekranın (Component) anlayacağı dile çevirir.

2. **`core/models.ts`**
   - *Benzetme:* Sözleşme veya Ortak Dil Sözlüğü.
   - *Görev:* Backend'deki DTO (Data Transfer Object) sınıflarının Typescript'teki (Angular'daki) karşılıklarıdır. İki tarafın aynı veri yapısını konuştuğundan emin olmayı sağlar. (Örn: C#'taki `OperationDto` ile Angular'daki `Operation` interface'i).

3. **Routing (`app.routes.ts`) ve Yetkilendirme (Guards)**
   - *Benzetme:* Trafik polisi ve kapı görevlileri.
   - *Görev:* Hangi URL adresine gidildiğinde hangi ekranın açılacağını belirler. Ayrıca `roleGuard` sayesinde kullanıcının o ekrana girme yetkisi yoksa (örn. Saha teknisyeni admin ekranına girmeye çalışırsa) onu dışarı atar.

4. **Component'ler (`features/ops`, `features/tech`)**
   - *Benzetme:* Televizyon ekranındaki farklı kanallar.
   - *Görev:* Her sayfanın görünümünü (HTML) ve o sayfadaki basit mantıkları (bir butona tıklanınca ne olacağı, `ApiService`'in çağrılması) içerir. 

## Günlük Hayattan Örnek
Bir restorandasınız (Sistem). Siparişi sizden alan ve mutfağa (Backend) ileten garson `ApiService`'tir. Siparişinizin yazılı olduğu menü `models.ts`'tir. Yemeğin sunulduğu şık tabak ve sizinle etkileşime geçen ortam ise Component'lerdir.
