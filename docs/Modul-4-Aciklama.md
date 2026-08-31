# Modül 4: Bildirim (Notification) Sistemi

## Amacı
Kullanıcılara uygulama içinde, onları ilgilendiren önemli olayları (yeni arıza atandı, SLA ihlali oldu, körük bağlandı vb.) anında bildirmek.

## Teknik Sınıflar ve Görevleri

1. **`NotificationService.cs`**
   - *Benzetme:* Postacı veya e-posta sunucusu.
   - *Görev:* Sistemin diğer parçalarından (örneğin FaultReportService) gelen "Şu kullanıcıya şu mesajı ilet" komutunu alır. Mesajı veritabanına kaydeder.
   - *Redis Cache Kullanımı:* Kullanıcının okunmamış bildirim sayısını sık sık menüde (Angular'da) göstermek gerektiği için, bu sayıyı her seferinde veritabanından saymak yerine Redis'te (veya MemoryCache'de) saklar. Yeni bildirim gelince cache'i temizler.

2. **`NotificationsController.cs`**
   - *Benzetme:* Posta kutusu.
   - *Görev:* Kullanıcı Angular ön yüzünden "Bildirimlerim neler?" diye sorduğunda, sadece o kullanıcının ID'sine (JWT'den gelen) ait bildirimleri döndürür. Başkasının bildirimini göstermez.

## Günlük Hayattan Örnek
Instagram'da birisi fotoğrafınızı beğendiğinde size gelen kalp ikonlu bildirim. Bu bildirim veritabanına kaydedilir ki daha sonra da görebilesiniz. Sağ üstteki "1" (okunmamış) sayısı ise hızı artırmak için Cache'te tutulur.
