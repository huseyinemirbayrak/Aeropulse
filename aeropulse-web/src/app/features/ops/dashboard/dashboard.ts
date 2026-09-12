import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';
import { SignalRService } from '../../../core/signalr.service';

@Component({
  selector: 'app-ops-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <!-- HEADER & TOP CONTROLS -->
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h1 class="section-title mb-0">Operasyon Kontrol Merkezi (OCC)</h1>
            <span class="live-pill"><span class="pulse-dot"></span> Canlı İzleme (LTFM)</span>
          </div>
          <p class="text-muted mt-1">Havalimanı hava sahası, yaklaşan uçuşlar, pist meşguliyeti ve apron kapı yönetimi</p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-refresh" (click)="loadAllData()" [disabled]="loading">
            <span [class.rotating]="loading">🔄</span> Yenile
          </button>
          <button class="btn btn-secondary" routerLink="/ops/gse-fleet">Apron Araçları</button>
          <button class="btn btn-secondary" routerLink="/ops/ramp">Saha Görevleri</button>
          <button class="btn btn-primary" routerLink="/ops/operations">Uçuş Seferleri</button>
        </div>
      </div>

      <!-- TOP METRIC CARDS -->
      <div class="grid grid-4 mb-4">
        <!-- PIST METRİK -->
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">PİST DURUMU</span>
            <span class="stat-badge success">{{ overview?.availableRunways || 0 }} Boş</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.totalRunways || 5 }}</span>
            <span class="stat-sub">Toplam Aktif Pist</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available" title="Boş">{{ overview?.availableRunways || 2 }} Boş</span>
            <span class="bar-pill busy" title="Meşgul">{{ (overview?.totalRunways || 5) - (overview?.availableRunways || 2) }} Meşgul</span>
          </div>
        </div>

        <!-- KAPI & PARK YERİ METRİK -->
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">KAPI & KÖRÜK</span>
            <span class="stat-badge info">{{ overview?.availableGates || 0 }} Boş</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.totalGates || 8 }}</span>
            <span class="stat-sub">{{ overview?.occupiedGates || 0 }} Dolu Kapı</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ overview?.availableGates || 4 }} Müsait</span>
            <span class="bar-pill occupied">{{ overview?.occupiedGates || 3 }} Dolu</span>
          </div>
        </div>

        <!-- UÇUŞ & GECİKME METRİK -->
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">UÇUŞ TRAFİĞİ</span>
            <span class="stat-badge warning" *ngIf="overview?.delayedOperations > 0">{{ overview?.delayedOperations }} Gecikme</span>
            <span class="stat-badge success" *ngIf="overview?.delayedOperations === 0">Zamanında</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.activeOperations || 0 }}</span>
            <span class="stat-sub">Aktif & Yaklaşan Uçuş</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.8rem;">Gecikmelerde anında manuel override yapın</span>
          </div>
        </div>

        <!-- YER DESTEK ARAÇLARI (GSE) -->
        <a routerLink="/ops/gse-fleet" class="glass-card stat-card" style="text-decoration: none; color: inherit; cursor: pointer;" title="Apron GSE Filosunu İncele">
          <div class="stat-header">
            <span class="stat-label">APRON ARAÇLARI (GSE) ➔</span>
            <span class="stat-badge secondary">{{ overview?.totalGSE || 8 }} Araç</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.idleGSE || 0 }}</span>
            <span class="stat-sub">Boşta Bekleyen Araç</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ overview?.idleGSE || 4 }} Boşta</span>
            <span class="bar-pill busy">{{ overview?.busyGSE || 3 }} Görevde</span>
            <span class="bar-pill danger" *ngIf="overview?.outOfServiceGSE > 0">{{ overview?.outOfServiceGSE }} Bakımda</span>
          </div>
        </a>
      </div>

      <!-- PİST DURUM RADAR KARTLARI -->
      <div class="glass-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="card-section-title">✈️ Canlı Pist Durumu (Runway Monitoring)</h3>
            <p class="text-muted mb-0">LTFM pistlerinin gerçek zamanlı iniş, kalkış ve bakım durumları</p>
          </div>
          <span class="badge info">5 Aktif Pist Tanımlı</span>
        </div>

        <div class="runways-grid">
          <div *ngFor="let runway of runways" class="runway-card" [ngClass]="getRunwayClass(runway.status)">
            <div class="runway-header">
              <span class="runway-code">{{ runway.runwayCode }}</span>
              <span class="badge" [ngClass]="getRunwayBadgeClass(runway.status)">
                {{ getRunwayStatusText(runway.status) }}
              </span>
            </div>
            
            <div class="runway-visual">
              <div class="runway-line">
                <span class="runway-icon" *ngIf="runway.status === 1">🛬</span>
                <span class="runway-icon" *ngIf="runway.status === 2">🛫</span>
                <span class="runway-icon" *ngIf="runway.status === 3">🚧</span>
                <span class="runway-icon" *ngIf="runway.status === 0">🟢</span>
              </div>
            </div>

            <div class="runway-info">
              <div *ngIf="runway.currentFlightNumber" class="current-flight">
                <strong>Uçuş:</strong> {{ runway.currentFlightNumber }}
              </div>
              <div class="runway-specs">
                <span>{{ runway.lengthMeters }}m</span> • <span>{{ runway.surfaceType }}</span>
              </div>
            </div>

            <button class="btn btn-sm btn-outline mt-2 w-100" (click)="openRunwayModal(runway)">
              Durumu Güncelle
            </button>
          </div>
        </div>
      </div>

      <!-- KAPI & PARK YERİ MATRİSİ -->
      <div class="glass-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="card-section-title">🚪 Terminal Kapı & Park Yeri Matrisi (Gates & Stands)</h3>
            <p class="text-muted mb-0">Terminal 1 körükleri ve açık apron park pozisyonları</p>
          </div>
          <div class="gate-filters">
            <button class="filter-btn" [class.active]="gateFilter === 'ALL'" (click)="gateFilter = 'ALL'">Tümü ({{ gates.length }})</button>
            <button class="filter-btn" [class.active]="gateFilter === 'AVAILABLE'" (click)="gateFilter = 'AVAILABLE'">Boş</button>
            <button class="filter-btn" [class.active]="gateFilter === 'OCCUPIED'" (click)="gateFilter = 'OCCUPIED'">Dolu</button>
          </div>
        </div>

        <div class="gates-grid">
          <div *ngFor="let gate of filteredGates" class="gate-card" [ngClass]="getGateClass(gate.status)">
            <div class="gate-top">
              <span class="gate-num">{{ gate.gateNumber }}</span>
              <span class="bridge-tag" *ngIf="gate.hasJetBridge" title="Körük Bağlantılı">🌉 Körük</span>
              <span class="stand-tag" *ngIf="!gate.hasJetBridge" title="Açık Park Pozisyonu">🚌 Açık Park</span>
            </div>

            <div class="gate-body">
              <span class="gate-status-pill" [ngClass]="getGateBadgeClass(gate.status)">
                {{ getGateStatusText(gate.status) }}
              </span>

              <div *ngIf="gate.currentFlightNumber" class="gate-flight-box mt-2">
                <div class="gate-flight-no">✈️ {{ gate.currentFlightNumber }}</div>
                <small *ngIf="gate.currentAircraftTailNumber" class="text-muted">{{ gate.currentAircraftTailNumber }}</small>
              </div>
              <div *ngIf="!gate.currentFlightNumber" class="gate-empty-box mt-2">
                <span class="text-muted">Boşta / Atamaya Hazır</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- YAKLAŞAN UÇUŞLAR & MANUEL OVERRIDE TABLOSU -->
      <div class="glass-card">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="card-section-title">🛬 Uçuş Trafiği & Dinamik Kapı Yönetimi (Flight Radar)</h3>
            <p class="text-muted mb-0">Yaklaşan/kalkacak uçuşlar ve anlık manuel "Override" (Kapı Değiştirme) yetkisi</p>
          </div>
          <span class="badge info">{{ upcomingFlights.length }} Uçuş Listelendi</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>UÇUŞ NO</th>
                <th>UÇAK / KUYRUK</th>
                <th>KAPI</th>
                <th>PİST</th>
                <th>VARIŞ / KALKIŞ</th>
                <th>DURUM</th>
                <th>GECİKME</th>
                <th style="text-align: right;">OCC İŞLEMİ</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let flight of upcomingFlights">
                <td>
                  <span class="flight-pill">✈️ {{ flight.flightNumber }}</span>
                </td>
                <td>
                  <strong>{{ flight.tailNumber || 'Bilinmiyor' }}</strong>
                  <div class="text-muted" style="font-size: 0.75rem;">{{ flight.aircraftModel || 'Ticari Uçak' }}</div>
                </td>
                <td>
                  <span class="gate-badge-table">{{ flight.gateNo || 'Atanmadı' }}</span>
                </td>
                <td>
                  <span class="runway-badge-table">{{ flight.assignedRunwayCode || '35L' }}</span>
                </td>
                <td>
                  <div>{{ flight.arrivalTime | date:'shortTime' }} - {{ flight.departureTime | date:'shortTime' }}</div>
                  <small class="text-muted">{{ flight.arrivalTime | date:'dd.MM.yyyy' }}</small>
                </td>
                <td>
                  <span class="status-pill" [ngClass]="flight.delayMinutes > 0 ? 'delayed' : 'on-time'">
                    {{ flight.status }}
                  </span>
                </td>
                <td>
                  <span *ngIf="flight.delayMinutes > 0" class="badge danger">+{{ flight.delayMinutes }} dk</span>
                  <span *ngIf="!flight.delayMinutes || flight.delayMinutes === 0" class="badge success">Zamanında</span>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-warning" (click)="openOverrideModal(flight)" title="Manuel Kapı Değişikliği">
                    🔄 Kapı Override
                  </button>
                  <a class="btn btn-sm btn-primary ml-1" [routerLink]="['/ops/turnaround', flight.id]" title="Harekat Memuru Turnaround Ekranı">
                    ⏱️ Redcap
                  </a>
                  <a class="btn btn-sm btn-outline ml-1" [routerLink]="['/ops/gate-agent', flight.id]" title="Yolcu Hizmetleri & Biniş Ekranı">
                    🚶‍♂️ Gate
                  </a>
                </td>
              </tr>

              <tr *ngIf="upcomingFlights.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">
                  Kayıtlı aktif uçuş bulunamadı.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL 1: OCC DİNAMİK KAPI OVERRIDE MODALI -->
      <div class="modal-backdrop" *ngIf="showOverrideModal">
        <div class="modal-content glass-card animate-fade-in">
          <div class="modal-header">
            <h3>🔄 OCC Kapı / Park Yeri Manuel Override</h3>
            <button class="close-btn" (click)="closeOverrideModal()">✕</button>
          </div>
          
          <div class="modal-body" *ngIf="selectedFlight">
            <div class="alert-info-box mb-3">
              <strong>Uçuş:</strong> {{ selectedFlight.flightNumber }} ({{ selectedFlight.tailNumber }})<br>
              <strong>Mevcut Kapı:</strong> <span class="badge warning">{{ selectedFlight.gateNo || 'Yok' }}</span>
            </div>

            <div class="form-group mb-3">
              <label>Yeni Kapı / Park Yeri Seçin <span style="color: #ef4444;">*</span></label>
              <select class="form-control" [(ngModel)]="overrideNewGate">
                <option value="" disabled>-- Müsait Bir Kapı Seçin --</option>
                <option *ngFor="let g of availableGateOptions" [value]="g.gateNumber">
                  {{ g.gateNumber }} ({{ g.hasJetBridge ? 'Körük' : 'Açık Park' }} - {{ g.status === 0 ? 'Müsait' : 'Dolu' }})
                </option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label>Override (Ezme) Gerekçesi <span style="color: #ef4444;">*</span></label>
              <select class="form-control" [(ngModel)]="overrideReason">
                <option value="Önceki uçuşta zincirleme gecikme meydana geldi">Önceki uçuşta zincirleme gecikme meydana geldi</option>
                <option value="Körük mekanik / hidrolik arızası">Körük mekanik / hidrolik arızası</option>
                <option value="Uçak tipine uygun daha geniş park pozisyonu ihtiyacı">Uçak tipine uygun daha geniş park pozisyonu ihtiyacı</option>
                <option value="Acil teknik bakım / AOG durumu">Acil teknik bakım / AOG durumu</option>
                <option value="OCC Nöbetçi Şefi Özel Kararı">OCC Nöbetçi Şefi Özel Kararı</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeOverrideModal()">İptal</button>
            <button class="btn btn-primary" (click)="submitOverride()" [disabled]="!overrideNewGate || overrideSubmitting">
              <span *ngIf="!overrideSubmitting">Kapıyı Değiştir ve Onayla</span>
              <span *ngIf="overrideSubmitting">İşleniyor...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: PİST DURUM GÜNCELLEME MODALI -->
      <div class="modal-backdrop" *ngIf="showRunwayModal">
        <div class="modal-content glass-card animate-fade-in">
          <div class="modal-header">
            <h3>✈️ Pist Durumu Güncelle (Pist {{ selectedRunway?.runwayCode }})</h3>
            <button class="close-btn" (click)="closeRunwayModal()">✕</button>
          </div>

          <div class="modal-body" *ngIf="selectedRunway">
            <div class="form-group mb-3">
              <label>Pist Durumu</label>
              <select class="form-control" [(ngModel)]="runwayNewStatus">
                <option [ngValue]="0">Available (Boş / Müsait)</option>
                <option [ngValue]="1">LandingInProgress (İniş Yapılıyor)</option>
                <option [ngValue]="2">TakeoffInProgress (Kalkış Yapılıyor)</option>
                <option [ngValue]="3">ClosedForMaintenance (Bakımda / Kapalı)</option>
                <option [ngValue]="4">Inspection (Pist Kontrol / Denetim)</option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label>İlgili Uçuş Numarası (Varsa)</label>
              <input type="text" class="form-control" [(ngModel)]="runwayFlightNumber" placeholder="Örn: TK1984">
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeRunwayModal()">İptal</button>
            <button class="btn btn-primary" (click)="submitRunwayUpdate()" [disabled]="runwaySubmitting">
              <span *ngIf="!runwaySubmitting">Pisti Güncelle</span>
              <span *ngIf="runwaySubmitting">Kaydediliyor...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .d-flex { display: flex; }
    .align-items-center { align-items: center; }
    .justify-content-between { justify-content: space-between; }
    .gap-2 { gap: 0.5rem; }
    .mb-0 { margin-bottom: 0; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .ml-1 { margin-left: 0.25rem; }
    .ml-2 { margin-left: 0.5rem; }
    .w-100 { width: 100%; }

    .dashboard {
      background: #ffffff;
      color: #111827;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-buttons {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .btn-refresh {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
      padding: 0.45rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8125rem;
    }
    .btn-refresh:hover {
      background: #f9fafb;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 4px;
      color: #15803d;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
    }

    /* STAT CARDS */
    .grid { display: grid; gap: 1rem; }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }

    .stat-card {
      padding: 1rem;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      letter-spacing: 0.05em;
    }

    .stat-badge {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .stat-badge.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .stat-badge.warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    .stat-badge.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .stat-badge.secondary { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }

    .stat-main {
      margin: 0.5rem 0;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
      line-height: 1.1;
    }
    .stat-sub {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .stat-footer-bar {
      display: flex;
      gap: 6px;
      margin-top: 0.5rem;
    }
    .bar-pill {
      font-size: 0.6875rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .bar-pill.available { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .bar-pill.busy { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .bar-pill.occupied { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .bar-pill.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

    /* RUNWAYS */
    .card-section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: #111827;
    }

    .runways-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .runway-card {
      padding: 0.875rem;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
    }
    .runway-card.available { border-color: #bbf7d0; }
    .runway-card.landing { border-color: #fde68a; background: #fffbeb; }
    .runway-card.takeoff { border-color: #bfdbfe; background: #eff6ff; }
    .runway-card.closed { border-color: #fecaca; opacity: 0.85; }

    .runway-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .runway-code {
      font-size: 1.125rem;
      font-weight: 700;
      color: #2563eb;
    }

    .runway-visual {
      background: #f8fafc;
      border-radius: 4px;
      padding: 0.5rem;
      margin: 0.5rem 0;
      text-align: center;
      border: 1px solid #e5e7eb;
      color: #111827;
    }
    .runway-icon {
      font-size: 1.25rem;
    }

    .runway-info {
      font-size: 0.75rem;
      margin: 0.35rem 0;
    }
    .current-flight {
      color: #d97706;
      font-weight: 600;
    }
    .runway-specs {
      color: #6b7280;
      font-size: 0.6875rem;
    }

    /* GATES GRID */
    .gate-filters {
      display: flex;
      gap: 6px;
    }
    .filter-btn {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #4b5563;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .filter-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      font-weight: 600;
    }

    .gates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
    }

    .gate-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 0.75rem;
      text-align: center;
    }
    .gate-card.available { border-color: #bbf7d0; }
    .gate-card.occupied { border-color: #fecaca; background: #fef2f2; }
    .gate-card.reserved { border-color: #fde68a; }

    .gate-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .gate-num {
      font-weight: 700;
      font-size: 1rem;
      color: #111827;
    }
    .bridge-tag, .stand-tag {
      font-size: 0.625rem;
      padding: 1px 4px;
      border-radius: 2px;
      background: #f3f4f6;
      color: #4b5563;
    }

    .gate-status-pill {
      display: inline-block;
      font-size: 0.6875rem;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .gate-status-pill.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .gate-status-pill.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .gate-status-pill.warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

    .gate-flight-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      padding: 3px;
    }
    .gate-flight-no {
      font-size: 0.75rem;
      font-weight: 700;
      color: #1d4ed8;
    }
    .gate-empty-box {
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* TABLE */
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
    }
    .data-table th {
      text-align: left;
      padding: 0.625rem 0.75rem;
      color: #4b5563;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .data-table td {
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      color: #111827;
      vertical-align: middle;
      background: #ffffff;
    }
    .flight-pill {
      font-weight: 600;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
    }
    .gate-badge-table {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #374151;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .runway-badge-table {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-content {
      width: 100%;
      max-width: 480px;
      padding: 1.5rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      color: #111827;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .modal-header h3 { margin: 0; font-size: 1.125rem; color: #111827; font-weight: 600; }
    .close-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.25rem;
      cursor: pointer;
    }
    .close-btn:hover { color: #111827; }
    .modal-body label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.35rem;
      color: #374151;
    }
    .alert-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 0.8125rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    /* FORM CONTROLS */
    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      color: #111827;
      font-size: 0.875rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #2563eb;
    }
  `]
})
export class OpsDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  overview: any = null;
  runways: any[] = [];
  gates: any[] = [];
  upcomingFlights: any[] = [];
  gateFilter: 'ALL' | 'AVAILABLE' | 'OCCUPIED' = 'ALL';

  // Override Modal state
  showOverrideModal = false;
  selectedFlight: any = null;
  overrideNewGate = '';
  overrideReason = 'Önceki uçuşta zincirleme gecikme meydana geldi';
  overrideSubmitting = false;

  // Runway Modal state
  showRunwayModal = false;
  selectedRunway: any = null;
  runwayNewStatus: number = 0;
  runwayFlightNumber = '';
  runwaySubmitting = false;

  private pollTimer: any = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private notification: NotificationService,
    private signalr: SignalRService
  ) {}

  ngOnInit() {
    this.loadAllData();

    // SignalR Canlı Dinleyiciler
    this.subs.push(
      this.signalr.gateOverride$.subscribe((ev) => {
        // Canlı kapı matrisi güncellemesi
        const flight = this.upcomingFlights.find(f => f.flightNumber === ev.flightNumber || f.id === ev.operationId);
        if (flight) {
          flight.gateNo = ev.newGateNumber;
        }

        // Eski kapıyı boşalt, yenisini doldur
        if (ev.oldGateNumber) {
          const oldG = this.gates.find(g => g.gateNumber === ev.oldGateNumber);
          if (oldG) {
            oldG.status = 0;
            oldG.currentFlightNumber = null;
          }
        }
        const newG = this.gates.find(g => g.gateNumber === ev.newGateNumber);
        if (newG) {
          newG.status = 1;
          newG.currentFlightNumber = ev.flightNumber;
        }

        if (this.overview) {
          this.overview.availableGates = this.gates.filter(g => g.status === 0).length;
          this.overview.occupiedGates = this.gates.filter(g => g.status === 1 || g.status === 2).length;
        }
      }),

      this.signalr.gse$.subscribe(() => {
        this.loadAllData(true);
      }),

      this.signalr.turnaround$.subscribe(() => {
        this.loadAllData(true);
      })
    );

    // 30 saniyede bir verileri arkadan tazeleyelim
    this.pollTimer = setInterval(() => {
      this.loadAllData(true);
    }, 30000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  loadAllData(silent = false) {
    if (!silent) this.loading = true;

    // apiden güncel pist, kapi ve ucus verilerini cekiyoruz
    this.api.getOccOverview().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.overview = res.data;
          this.runways = res.data.runways || [];
          this.gates = res.data.gates || [];
          this.upcomingFlights = res.data.upcomingFlights || [];
          // console.log('Gelen ucuslar:', this.upcomingFlights.length);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Veri yuklenirken hata alindi:', err);
      }
    });
  }

  get filteredGates(): any[] {
    if (this.gateFilter === 'AVAILABLE') {
      return this.gates.filter(g => g.status === 0);
    }
    if (this.gateFilter === 'OCCUPIED') {
      return this.gates.filter(g => g.status === 1 || g.status === 2);
    }
    return this.gates;
  }

  get availableGateOptions(): any[] {
    return this.gates;
  }

  // Runway status helpers
  getRunwayStatusText(status: number): string {
    switch (status) {
      case 0: return 'BOŞ / MÜSAİT';
      case 1: return 'İNİŞ YAPILIYOR';
      case 2: return 'KALKIŞ YAPILIYOR';
      case 3: return 'KAPALI (BAKIMDA)';
      case 4: return 'DENETİM / KONTROL';
      default: return 'BİLİNMİYOR';
    }
  }

  getRunwayClass(status: number): string {
    switch (status) {
      case 0: return 'available';
      case 1: return 'landing';
      case 2: return 'takeoff';
      case 3: return 'closed';
      default: return '';
    }
  }

  getRunwayBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'success';
      case 1: return 'warning';
      case 2: return 'info';
      case 3: return 'danger';
      default: return 'secondary';
    }
  }

  // Gate status helpers
  getGateStatusText(status: number): string {
    switch (status) {
      case 0: return 'BOŞ';
      case 1: return 'DOLU';
      case 2: return 'REZERVE';
      case 3: return 'BAKIMDA';
      default: return 'BİLİNMİYOR';
    }
  }

  getGateClass(status: number): string {
    switch (status) {
      case 0: return 'available';
      case 1: return 'occupied';
      case 2: return 'reserved';
      default: return '';
    }
  }

  getGateBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'success';
      case 1: return 'danger';
      case 2: return 'warning';
      default: return 'secondary';
    }
  }

  // Override Modal
  openOverrideModal(flight: any) {
    this.selectedFlight = flight;
    this.overrideNewGate = '';
    this.overrideReason = 'Önceki uçuşta zincirleme gecikme meydana geldi';
    this.showOverrideModal = true;
  }

  closeOverrideModal() {
    this.showOverrideModal = false;
    this.selectedFlight = null;
  }

  submitOverride() {
    if (!this.selectedFlight || !this.overrideNewGate) return;

    this.overrideSubmitting = true;
    this.api.overrideGate({
      operationId: this.selectedFlight.id,
      newGateNumber: this.overrideNewGate,
      reason: this.overrideReason
    }).subscribe({
      next: (res) => {
        this.overrideSubmitting = false;
        if (res.success) {
          console.log('Kapı değişikliği kaydedildi:', this.selectedFlight.flightNumber, this.overrideNewGate);
          this.notification.success(`Kapı değiştirildi: ${this.selectedFlight.flightNumber} -> Kapı ${this.overrideNewGate}`);
          this.closeOverrideModal();
          this.loadAllData();
        } else {
          this.notification.error(res.message || 'Kapı değiştirilemedi.');
        }
      },
      error: (err) => {
        this.overrideSubmitting = false;
        console.error('Kapı güncelleme hatası:', err);
        this.notification.error(err.error?.message || 'İşlem sırasında hata oluştu.');
      }
    });
  }

  // Runway Modal
  openRunwayModal(runway: any) {
    this.selectedRunway = runway;
    this.runwayNewStatus = runway.status;
    this.runwayFlightNumber = runway.currentFlightNumber || '';
    this.showRunwayModal = true;
  }

  closeRunwayModal() {
    this.showRunwayModal = false;
    this.selectedRunway = null;
  }

  submitRunwayUpdate() {
    if (!this.selectedRunway) return;

    this.runwaySubmitting = true;
    this.api.updateRunwayStatus(this.selectedRunway.id, {
      status: Number(this.runwayNewStatus),
      currentFlightNumber: this.runwayFlightNumber || null
    }).subscribe({
      next: (res) => {
        this.runwaySubmitting = false;
        if (res.success) {
          this.notification.success(`✅ Pist ${this.selectedRunway.runwayCode} durumu güncellendi.`);
          this.closeRunwayModal();
          this.loadAllData();
        } else {
          this.notification.error(res.message || 'Pist durumu güncellenemedi.');
        }
      },
      error: (err) => {
        this.runwaySubmitting = false;
        this.notification.error(err.error?.message || 'Pist güncellenirken hata oluştu.');
      }
    });
  }
}
