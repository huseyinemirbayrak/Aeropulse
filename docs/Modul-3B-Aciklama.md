# Modül 3B: Körük (Jet Bridge) Takip ve Çakışma Yönetimi

## Amacı
Havalimanlarındaki yolcu köprülerinin (körük) uçaklara atanmasını sağlamak. Gerçek dünyada en büyük problemlerden biri olan "Gate Conflict" (iki uçağın aynı saatte aynı köprüye atanması) sorununu algılamak ve engellemek.

## Teknik Sınıflar ve Görevleri

1. **`JetBridgeService.cs`**
   - *Benzetme:* Havalimanı kule kontrolörü (Yer trafiği için).
   - *Görev:* Körük atamalarını yapar. En önemli görevi `CheckAvailabilityAsync` metodudur. Bir köprüye yeni bir uçak atanmak istendiğinde, o saat aralığında o köprüde başka bir uçak olup olmadığını kontrol eder. Eğer varsa atamayı reddeder (Conflict) ve boş olan alternatif köprüleri önerir.
   - *Redis Cache Kullanımı:* Boş köprüleri listelemek yoğun bir işlem olabileceğinden, boş köprü listesi Redis (veya IMemoryCache) üzerinde tutulur. Böylece veritabanı yorulmaz.

2. **`JetBridgesController.cs`**
   - *Benzetme:* Uçuş bilgi ekranlarına veri sağlayan ana bilgisayar.
   - *Görev:* Atama isteklerini alır. Eğer çakışma varsa HTTP 409 (Conflict) durum koduyla hatayı ve alternatif köprüleri Angular'a gönderir.

## Çakışma Kontrol Algoritması
İki zaman aralığının (Mevcut atama ve Yeni Atama) çakışması şu mantıkla bulunur:
`Yeni.Baslangic < Mevcut.Bitis` VE `Yeni.Bitis > Mevcut.Baslangic`
Eğer bu şart sağlanıyorsa iki uçak aynı anda köprüyü kullanmaya çalışıyor demektir.

## Günlük Hayattan Örnek
Bir restoranda masa rezervasyonu yapmak gibidir. Siz 14:00 - 16:00 arası "Masa 5"i ayırttınız. Başka biri gelip "15:00 - 17:00 arası Masa 5'i istiyorum" dediğinde, sistem çakışmayı algılar (Conflict) ve "Masa 5 dolu ama Masa 7 boş" der.
