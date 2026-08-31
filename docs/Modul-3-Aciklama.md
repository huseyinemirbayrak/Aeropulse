# Modül 3: Yer Hizmetleri (Turnaround) ve Arıza Raporları

## Amacı
Bir uçağın havalimanına inişinden kalkışına kadar geçen süredeki (Turnaround) yer hizmetleri operasyonlarını takip etmek. Ayrıca, bu süreçte veya saha kontrollerinde tespit edilen arızaların (Fault Reports) anında raporlanıp ilgili mühendislere iletilmesini sağlamak.

## Teknik Sınıflar ve Görevleri

1. **`OperationService.cs` (ve `IOperationService.cs`)**
   - *Benzetme:* Bir orkestra şefi.
   - *Görev:* Uçağın gelişiyle başlayan operasyonları yönetir. En önemli görevi `CloseWithSLAAsync` metodudur.
   - *Detay:* Bu metot bir **Transaction** kullanır. Yani, operasyon kapatılırken aynı anda bir SLA (Hizmet Seviyesi Anlaşması) başarı/başarısızlık kaydı yazılır. İkisinden biri hata verirse, "ya hep ya hiç" mantığıyla işlem tamamen geri alınır (Rollback). Bu, bankalardaki para transferi mantığıyla aynıdır.

2. **`FaultReportService.cs` (ve `IFaultReportService.cs`)**
   - *Benzetme:* Acil durum hattı operatörü.
   - *Görev:* Saha teknisyenlerinin girdiği arıza kayıtlarını alır, veritabanına kaydeder ve `IMessageBusService` (RabbitMQ) üzerinden "Yeni Arıza Var" diye bağırır (Publish).

3. **`OperationsController.cs` & `FaultReportsController.cs`**
   - *Benzetme:* Şirketin danışma masası.
   - *Görev:* Ön yüzden (Angular/Mobil) gelen istekleri alır, ilgili servislere yönlendirir ve sonucu kullanıcıya iletir.

## Günlük Hayattan Örnek
Bir kargo şirketinde, kuryenin paketi teslim ettiği anı düşünün (Turnaround). Kurye, cihazından "Teslim Edildi"ye bastığında hem sistemde paket "Tamamlandı" olur, hem de size "Paketiniz teslim edildi" SMS'i gelir (Transaction). Eğer SMS sistemi çökerse, kuryenin ekranında da işlem tamamlanmamış görünür ki veriler tutarsız olmasın.
