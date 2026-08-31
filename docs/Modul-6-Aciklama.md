# Modül 6: Metrikler ve Sistem İzleme (Grafana Entegrasyonu)

## Amacı
Sistemin genel sağlık durumunu ve performansını (kaç açık arıza var, ne kadar SLA ihlali yapılmış, boş körük var mı vb.) dış sistemlere (örneğin Grafana gibi bir izleme aracına) raporlamak.

## Teknik Sınıflar ve Görevleri

1. **`MetricsController.cs`**
   - *Benzetme:* Şirketin aylık faaliyet raporunu yayınlayan basın sözcüsü.
   - *Görev:* `[AllowAnonymous]` niteliğine sahiptir, yani dışarıdan (Grafana sunucusundan) gelen isteklerde şifre/token sormaz. Sadece okunabilir veri üretir, sisteme bir şey yazmaz.
   - *Prometheus Exposition Format:* `GET /api/metrics/prometheus` endpoint'i veriyi JSON değil, Grafana'nın en sevdiği metin tabanlı formata çevirip gönderir (`metric_name value`).

2. **Metrik Hesaplama Mantığı**
   - *Benzetme:* Muhasebecinin defterleri toplayıp özet çıkarması.
   - *Görev:* Anlık olarak veritabanına sorgu atarak (Örn: `CountAsync()`) açık arıza sayılarını, ortalama çözüm sürelerini hesaplar ve döner.

## Günlük Hayattan Örnek
Bir hastanenin bekleme odasında duvarda asılı olan, "Şu an sırada 5 kişi var, ortalama bekleme süresi 12 dakika" yazan elektronik tabelayı düşünün. `MetricsController`, o tabelayı besleyen veriyi veren beyindir. Grafana ise o dev ekranın kendisidir.
