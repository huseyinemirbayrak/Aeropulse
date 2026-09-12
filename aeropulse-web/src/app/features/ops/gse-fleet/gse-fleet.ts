import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';
import { SignalRService } from '../../../core/signalr.service';

@Component({
  selector: 'app-gse-fleet',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <!-- HEADER -->
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="fleet-badge">🚜 GSE</span>
            <h1 class="section-title mb-0">Apron Yer Destek Ekipmanları Filosu</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            Otobüsler, yakıt tankerleri, bagaj çekicileri ve pushback araçlarının anlık apron takibi, yakıt ve bakım yönetimi
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" (click)="loadGSE()">🔄 Yenile</button>
          <a class="btn btn-outline" routerLink="/ops/dashboard">Uçuş Radarı</a>
          <a class="btn btn-secondary" routerLink="/ops/ramp">Saha Görevleri</a>
        </div>
      </div>

      <!-- KPI METRİK KARTLARI -->
      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper blue">🚜</div>
          <div class="stat-details">
            <div class="stat-num">{{ gseList.length }}</div>
            <div class="stat-label">Toplam GSE Ekipmanı</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper green">🟢</div>
          <div class="stat-details">
            <div class="stat-num">{{ idleCount }}</div>
            <div class="stat-label">Boşta / Göreve Hazır</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper amber">🟡</div>
          <div class="stat-details">
            <div class="stat-num">{{ busyCount }}</div>
            <div class="stat-label">Görevde (Aktif Sefer)</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper red">🔴</div>
          <div class="stat-details">
            <div class="stat-num">{{ outOfServiceCount }}</div>
            <div class="stat-label">Bakımda / Arızalı</div>
          </div>
        </div>
      </div>

      <!-- FİLTRE VE ARAMA ÇUBUĞU -->
      <div class="glass-card mb-4 filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Araç Kodu (BUS-01, TANKER-01), Operatör veya Bölge ara..."
            class="search-input"
          />
        </div>

        <!-- TİP FİLTRELERİ -->
        <div class="type-filters">
          <button class="filter-pill" [class.active]="selectedType === 'ALL'" (click)="selectedType = 'ALL'">
            Tüm Tipler ({{ gseList.length }})
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'PassengerBus'" (click)="selectedType = 'PassengerBus'">
            🚌 Otobüsler
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'FuelTanker'" (click)="selectedType = 'FuelTanker'">
            ⛽ Yakıt Tankerleri
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'BaggageTug'" (click)="selectedType = 'BaggageTug'">
            🚜 Bagaj Çekicileri
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'PushbackTruck'" (click)="selectedType = 'PushbackTruck'">
            🛫 Pushback Araçları
          </button>
        </div>

        <!-- STATÜ FİLTRELERİ -->
        <div class="status-filters">
          <button class="status-pill-btn" [class.active]="selectedStatus === 'ALL'" (click)="selectedStatus = 'ALL'">
            Tüm Statüler
          </button>
          <button class="status-pill-btn idle" [class.active]="selectedStatus === 'Idle'" (click)="selectedStatus = 'Idle'">
            🟢 Boşta ({{ idleCount }})
          </button>
          <button class="status-pill-btn busy" [class.active]="selectedStatus === 'Busy'" (click)="selectedStatus = 'Busy'">
            🟡 Görevde ({{ busyCount }})
          </button>
          <button class="status-pill-btn out" [class.active]="selectedStatus === 'OutOfService'" (click)="selectedStatus = 'OutOfService'">
            🔴 Bakımda ({{ outOfServiceCount }})
          </button>
        </div>
      </div>

      <!-- ARAÇ KARTLARI IZGARASI -->
      <div class="gse-grid">
        <div *ngFor="let vehicle of filteredGSE" class="glass-card vehicle-card" [ngClass]="getCardStatusClass(vehicle.status)">
          <!-- KART ÜST BAŞLIK -->
          <div class="vehicle-card-top">
            <div class="d-flex align-items-center gap-2">
              <span class="vehicle-icon-box">{{ getVehicleTypeIcon(vehicle.type) }}</span>
              <div>
                <h3 class="vehicle-code mb-0">{{ vehicle.code }}</h3>
                <span class="vehicle-type-text">{{ getVehicleTypeName(vehicle.type) }}</span>
              </div>
            </div>

            <!-- STATÜ ROZETİ -->
            <span class="badge" [ngClass]="getStatusBadgeClass(vehicle.status)">
              {{ getStatusText(vehicle.status) }}
            </span>
          </div>

          <!-- ARAÇ ADI VE AÇIKLAMA -->
          <p class="vehicle-name text-white mt-3 mb-2 font-weight-bold">
            {{ vehicle.name }}
          </p>

          <!-- GÖREVDE VEYA BAKIMDA BİLGİSİ -->
          <div *ngIf="vehicle.status === 1" class="task-info-box busy-box mb-3">
            <span class="box-label">AKTİF GÖREV:</span>
            <div class="task-desc">
              {{ vehicle.currentTaskDescription || 'Uçuş Dönüş Operasyonunda' }}
            </div>
          </div>

          <div *ngIf="vehicle.status === 2" class="task-info-box out-of-service-box mb-3">
            <span class="box-label">⚠️ ARIZA & BAKIM KAYDI:</span>
            <div class="task-desc text-danger font-weight-bold">
              {{ vehicle.currentTaskDescription || 'Serviste / Bakım Hangarı (Yeni Göreve Kilitli)' }}
            </div>
          </div>

          <!-- DETAY METADATA PİLLERİ -->
          <div class="vehicle-meta-grid mb-3">
            <div class="meta-item">
              <span class="meta-label">APRON BÖLGESİ</span>
              <strong class="meta-val">📍 {{ vehicle.apronZone || 'Terminal 1 Ramp' }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">SORUMLU OPERATÖR</span>
              <strong class="meta-val">👤 {{ vehicle.operatorName || 'Atanmadı' }}</strong>
            </div>
          </div>

          <!-- YAKIT / ŞARJ SEVİYESİ GÖSTERGESİ -->
          <div class="fuel-section mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fuel-label">
                {{ vehicle.type === 4 ? '⚡ Akü / Şarj Seviyesi' : '⛽ Yakıt / Enerji Seviyesi' }}
              </span>
              <strong class="fuel-percentage" [ngClass]="getFuelColorClass(vehicle.fuelLevelPercentage)">
                {{ vehicle.fuelLevelPercentage }}%
              </strong>
            </div>
            <div class="fuel-track">
              <div 
                class="fuel-fill" 
                [style.width.%]="vehicle.fuelLevelPercentage"
                [ngClass]="getFuelColorClass(vehicle.fuelLevelPercentage)"
              ></div>
            </div>
          </div>

          <!-- AKSİYON BUTONLARI -->
          <div class="vehicle-actions">
            <button class="btn btn-sm btn-outline flex-grow-1" (click)="openStatusModal(vehicle)">
              ⚙️ Durumu Güncelle
            </button>
            <button 
              class="btn btn-sm btn-secondary" 
              (click)="refuelVehicle(vehicle)"
              [disabled]="vehicle.fuelLevelPercentage >= 100"
              title="Yakıt / Şarj seviyesini %100 doldur"
            >
              ⛽ İkmal (%100)
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="filteredGSE.length === 0" class="glass-card text-center py-5">
        <p class="text-muted mb-0">Seçilen filtre ve arama kriterlerine uygun apron aracı bulunamadı.</p>
      </div>

      <!-- MODAL: ARAÇ STATÜSÜ GÜNCELLEME VE ARIZA BİLDİRİMİ -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="modal-content glass-card animate-fade-in">
          <div class="modal-header">
            <h3>⚙️ {{ selectedVehicle?.code }} — GSE Durum ve Konum Yönetimi</h3>
            <button class="close-btn" (click)="closeStatusModal()">✕</button>
          </div>

          <div class="modal-body" *ngIf="selectedVehicle">
            <p class="text-muted mb-3">
              {{ selectedVehicle.name }} aracının sahadaki anlık durumunu, bulunduğu apron bölgesini ve yakıt seviyesini güncelleyin.
            </p>

            <!-- STATÜ SEÇİMİ -->
            <div class="form-group mb-3">
              <label class="form-label">Araç Operasyonel Statüsü</label>
              <div class="status-select-grid">
                <button 
                  type="button"
                  class="status-opt-btn" 
                  [class.selected]="modalStatus === 0"
                  (click)="modalStatus = 0"
                >
                  🟢 Boşta (Idle)
                </button>
                <button 
                  type="button"
                  class="status-opt-btn" 
                  [class.selected]="modalStatus === 1"
                  (click)="modalStatus = 1"
                >
                  🟡 Görevde (Busy)
                </button>
                <button 
                  type="button"
                  class="status-opt-btn danger-opt" 
                  [class.selected]="modalStatus === 2"
                  (click)="modalStatus = 2"
                >
                  🔴 Bakımda / Arızalı
                </button>
              </div>
            </div>

            <!-- BAKIMDA / ARIZALI UYARISI -->
            <div class="form-group mb-3" *ngIf="modalStatus === 2">
              <div class="out-warning-alert mb-2">
                ⚠️ <strong>Uyarı:</strong> Araç "Bakımda / Arızalı" statüsüne alındığında Turnaround ve Ramp iş emirlerine atanması sistem tarafından engellenir!
              </div>
              <label class="form-label">Arıza / Bakım Açıklaması</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="modalTaskDescription"
                placeholder="Örn: Fren hidroliği sızıntısı / 2 saat bakım hangarı"
              />
            </div>

            <!-- GÖREVDE İSE GÖREV AÇIKLAMASI -->
            <div class="form-group mb-3" *ngIf="modalStatus === 1">
              <label class="form-label">Aktif Görev / Sefer Açıklaması</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="modalTaskDescription"
                placeholder="Örn: TK1984 Yakıt İkmali (8.500 kg)"
              />
            </div>

            <!-- APRON BÖLGESİ -->
            <div class="form-group mb-3">
              <label class="form-label">Bulunduğu Apron Bölgesi</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="modalApronZone"
                placeholder="Örn: Gate A1, Stand-102, Bakım Hangarı, Tasnif Alanı"
              />
            </div>

            <!-- YAKIT SEVİYESİ -->
            <div class="form-group mb-4">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label mb-0">Yakıt / Şarj Seviyesi (%)</label>
                <strong>{{ modalFuelLevel }}%</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                [(ngModel)]="modalFuelLevel" 
                class="range-slider w-100"
              />
            </div>

            <!-- MODAL AKSİYONLARI -->
            <div class="d-flex justify-content-end gap-2">
              <button class="btn btn-secondary" (click)="closeStatusModal()">İptal</button>
              <button class="btn btn-primary" (click)="saveStatusChanges()" [disabled]="modalSaving">
                {{ modalSaving ? 'Kaydediliyor...' : '✓ Değişiklikleri Kaydet' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
    }

    .fleet-badge {
      font-size: 1.1rem;
      font-weight: 800;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.15);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .header-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* GRID */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .stat-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .stat-icon-wrapper.blue { background: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.3); }
    .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }
    .stat-icon-wrapper.amber { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .stat-icon-wrapper.red { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }

    .stat-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* FILTER BAR */
    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .search-input-wrapper {
      position: relative;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.9rem;
      color: #64748b;
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 0.8rem 0.65rem 2.4rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 0.875rem;
      outline: none;
    }
    .search-input:focus {
      border-color: #00d4ff;
      background: rgba(30, 41, 59, 0.9);
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
    }

    .type-filters, .status-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-pill:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .filter-pill.active {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      color: #00d4ff;
      font-weight: 700;
    }

    .status-pill-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .status-pill-btn.active { background: rgba(255, 255, 255, 0.15); color: #fff; }
    .status-pill-btn.idle.active { background: rgba(16, 185, 129, 0.2); border-color: #10b981; color: #34d399; }
    .status-pill-btn.busy.active { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; color: #fbbf24; }
    .status-pill-btn.out.active { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #f87171; }

    /* VEHICLE CARDS GRID */
    .gse-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .vehicle-card {
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }
    .vehicle-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 212, 255, 0.3);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .vehicle-card.busy-card {
      border-left: 4px solid #f59e0b;
    }
    .vehicle-card.out-card {
      border-left: 4px solid #ef4444;
      background: rgba(239, 68, 68, 0.03);
    }
    .vehicle-card.idle-card {
      border-left: 4px solid #10b981;
    }

    .vehicle-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .vehicle-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
    }

    .vehicle-code {
      font-size: 1.15rem;
      font-weight: 800;
      color: #fff;
    }

    .vehicle-type-text {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .vehicle-name {
      font-size: 0.95rem;
    }

    .task-info-box {
      padding: 0.6rem 0.8rem;
      border-radius: 6px;
      font-size: 0.8rem;
    }
    .busy-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .out-of-service-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .box-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      display: block;
      margin-bottom: 2px;
    }

    .vehicle-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.6rem;
      border-radius: 6px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 0.65rem;
      color: #94a3b8;
      font-weight: 700;
    }

    .meta-val {
      font-size: 0.8rem;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* FUEL SECTION */
    .fuel-section {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.6rem;
      border-radius: 6px;
    }

    .fuel-label {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .fuel-percentage {
      font-size: 0.85rem;
      font-weight: 700;
    }
    .fuel-percentage.high { color: #34d399; }
    .fuel-percentage.medium { color: #fbbf24; }
    .fuel-percentage.low { color: #f87171; }

    .fuel-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 4px;
    }

    .fuel-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }
    .fuel-fill.high { background: #10b981; }
    .fuel-fill.medium { background: #f59e0b; }
    .fuel-fill.low { background: #ef4444; }

    .vehicle-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      width: 100%;
      max-width: 520px;
      background: #0f172a;
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1rem;
      margin-bottom: 1rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .status-select-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-top: 0.4rem;
    }

    .status-opt-btn {
      padding: 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .status-opt-btn.selected {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      color: #fff;
    }
    .status-opt-btn.danger-opt.selected {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #f87171;
    }

    .out-warning-alert {
      padding: 0.6rem 0.8rem;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #f87171;
      font-size: 0.8rem;
    }

    .form-control {
      width: 100%;
      padding: 0.6rem 0.8rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #fff;
      font-size: 0.875rem;
      outline: none;
    }
    .form-control:focus {
      border-color: #00d4ff;
    }

    .range-slider {
      cursor: pointer;
      margin-top: 0.5rem;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge.success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge.danger { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
  `]
})
export class GseFleetComponent implements OnInit, OnDestroy {
  gseList: any[] = [];
  searchQuery = '';
  selectedType = 'ALL';
  selectedStatus = 'ALL';

  // Modal State
  showModal = false;
  selectedVehicle: any = null;
  modalStatus: number = 0;
  modalApronZone: string = '';
  modalFuelLevel: number = 85;
  modalTaskDescription: string = '';
  modalSaving = false;

  private pollTimer: any = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private notification: NotificationService,
    private signalr: SignalRService
  ) {}

  ngOnInit() {
    this.loadGSE();

    // Canli arac durumu guncellemesi
    this.subs.push(
      this.signalr.gse$.subscribe((ev) => {
        const v = this.gseList.find(x => x.id === ev.gseId || x.code === ev.code);
        if (v) {
          const statusNum = ev.status === 'OutOfService' ? 2 : ev.status === 'Busy' ? 1 : 0;
          v.status = statusNum;
          v.fuelLevelPercentage = ev.fuelLevelPercentage;
          if (ev.apronZone) v.apronZone = ev.apronZone;
          if (ev.currentTaskDescription !== undefined) v.currentTaskDescription = ev.currentTaskDescription;
        } else {
          this.loadGSE(true);
        }
      })
    );

    this.pollTimer = setInterval(() => {
      this.loadGSE(true);
    }, 20000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  loadGSE(silent = false) {
    this.api.getGSE().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.gseList = res.data;
        }
      },
      error: (err) => console.error('GSE listesi yüklenemedi:', err)
    });
  }

  normalizeType(t: any): string {
    if (t === 0 || t === '0' || t === 'PassengerBus') return 'PassengerBus';
    if (t === 1 || t === '1' || t === 'FuelTanker') return 'FuelTanker';
    if (t === 2 || t === '2' || t === 'BaggageTug') return 'BaggageTug';
    if (t === 3 || t === '3' || t === 'PassengerStairs') return 'PassengerStairs';
    if (t === 4 || t === '4' || t === 'PushbackTruck') return 'PushbackTruck';
    if (t === 5 || t === '5' || t === 'GPU') return 'GPU';
    return String(t || '');
  }

  normalizeStatus(s: any): string {
    if (s === 0 || s === '0' || s === 'Idle') return 'Idle';
    if (s === 1 || s === '1' || s === 'Busy') return 'Busy';
    if (s === 2 || s === '2' || s === 'OutOfService') return 'OutOfService';
    return String(s || '');
  }

  get idleCount(): number {
    return this.gseList.filter(g => this.normalizeStatus(g.status) === 'Idle').length;
  }

  get busyCount(): number {
    return this.gseList.filter(g => this.normalizeStatus(g.status) === 'Busy').length;
  }

  get outOfServiceCount(): number {
    return this.gseList.filter(g => this.normalizeStatus(g.status) === 'OutOfService').length;
  }

  get filteredGSE(): any[] {
    return this.gseList.filter(g => {
      const q = (this.searchQuery || '').trim().toLowerCase();
      const matchesSearch = !q ||
        (g.code && g.code.toLowerCase().includes(q)) ||
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.operatorName && g.operatorName.toLowerCase().includes(q)) ||
        (g.apronZone && g.apronZone.toLowerCase().includes(q)) ||
        (g.currentTaskDescription && g.currentTaskDescription.toLowerCase().includes(q));

      const gTypeNorm = this.normalizeType(g.type);
      const selectedTypeNorm = this.selectedType === 'ALL' ? 'ALL' : this.normalizeType(this.selectedType);
      const matchesType = selectedTypeNorm === 'ALL' || gTypeNorm === selectedTypeNorm;

      const gStatusNorm = this.normalizeStatus(g.status);
      const selectedStatusNorm = this.selectedStatus === 'ALL' ? 'ALL' : this.normalizeStatus(this.selectedStatus);
      const matchesStatus = selectedStatusNorm === 'ALL' || gStatusNorm === selectedStatusNorm;

      return matchesSearch && matchesType && matchesStatus;
    });
  }

  getVehicleTypeIcon(type: any): string {
    const t = this.normalizeType(type);
    switch (t) {
      case 'PassengerBus': return '🚌';
      case 'FuelTanker': return '⛽';
      case 'BaggageTug': return '🚜';
      case 'PassengerStairs': return '🪜';
      case 'PushbackTruck': return '🛫';
      case 'GPU': return '⚡';
      default: return '🚜';
    }
  }

  getVehicleTypeName(type: any): string {
    const t = this.normalizeType(type);
    switch (t) {
      case 'PassengerBus': return 'Yolcu Otobüsü';
      case 'FuelTanker': return 'Jet A-1 Yakıt Tankeri';
      case 'BaggageTug': return 'Bagaj Traktörü / Çekici';
      case 'PassengerStairs': return 'Yolcu Merdiveni';
      case 'PushbackTruck': return 'Pushback Çekici';
      case 'GPU': return 'Yer Güç Ünitesi (GPU)';
      default: return 'Destek Ekipmanı';
    }
  }

  getStatusText(status: any): string {
    const s = this.normalizeStatus(status);
    switch (s) {
      case 'Idle': return 'Boşta (Hazır)';
      case 'Busy': return 'Görevde (Aktif)';
      case 'OutOfService': return 'Bakımda / Servis Dışı';
      default: return 'Bilinmiyor';
    }
  }

  getStatusBadgeClass(status: any): string {
    const s = this.normalizeStatus(status);
    switch (s) {
      case 'Idle': return 'success';
      case 'Busy': return 'warning';
      case 'OutOfService': return 'danger';
      default: return 'secondary';
    }
  }

  getCardStatusClass(status: any): string {
    const s = this.normalizeStatus(status);
    switch (s) {
      case 'Idle': return 'idle-card';
      case 'Busy': return 'busy-card';
      case 'OutOfService': return 'out-card';
      default: return '';
    }
  }

  getFuelColorClass(level: number): string {
    if (level >= 60) return 'high';
    if (level >= 25) return 'medium';
    return 'low';
  }

  openStatusModal(vehicle: any) {
    this.selectedVehicle = vehicle;
    this.modalStatus = vehicle.status;
    this.modalApronZone = vehicle.apronZone || '';
    this.modalFuelLevel = vehicle.fuelLevelPercentage || 80;
    this.modalTaskDescription = vehicle.currentTaskDescription || '';
    this.showModal = true;
  }

  closeStatusModal() {
    this.showModal = false;
    this.selectedVehicle = null;
  }

  saveStatusChanges() {
    if (!this.selectedVehicle) return;

    this.modalSaving = true;
    this.api.updateGSEStatus(this.selectedVehicle.id, {
      status: this.modalStatus,
      apronZone: this.modalApronZone,
      fuelLevelPercentage: this.modalFuelLevel,
      currentTaskDescription: this.modalTaskDescription
    }).subscribe({
      next: (res) => {
        this.modalSaving = false;
        if (res.success) {
          this.selectedVehicle.status = this.modalStatus;
          this.selectedVehicle.apronZone = this.modalApronZone;
          this.selectedVehicle.fuelLevelPercentage = this.modalFuelLevel;
          this.selectedVehicle.currentTaskDescription = this.modalTaskDescription;
          this.notification.success(`✅ ${this.selectedVehicle.code} durumu başarıyla güncellendi.`);
          this.closeStatusModal();
        } else {
          this.notification.error(res.message || 'Güncellenemedi.');
        }
      },
      error: () => {
        this.modalSaving = false;
        this.notification.error('Sunucu hatası.');
      }
    });
  }

  refuelVehicle(vehicle: any) {
    this.api.refuelGSE(vehicle.id).subscribe({
      next: (res) => {
        if (res.success) {
          vehicle.fuelLevelPercentage = 100;
          this.notification.success(`⛽ ${vehicle.code} yakıt/şarj seviyesi %100 yapıldı!`);
        }
      },
      error: () => this.notification.error('İkmal işlemi başarısız oldu.')
    });
  }
}
