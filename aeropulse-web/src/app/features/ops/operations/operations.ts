import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <!-- HEADER & ACTIONS -->
      <div class="header-actions mb-4">
        <div>
          <h1 class="section-title mb-1">✈️ Uçuş & Turnaround Operasyonları</h1>
          <p class="text-muted mb-0">Havalimanı aktif seferlerinin 45-60 dakikalık yer hizmeti (Redcap) ve biniş koordinasyonu</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary" (click)="loadOps()">🔄 Seferleri Yenile</button>
          <a class="btn btn-outline" routerLink="/ops/dashboard">🛫 OCC Kuşbakışı Radar</a>
        </div>
      </div>

      <!-- KPI METRİK KARTLARI -->
      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper blue">✈️</div>
          <div class="stat-details">
            <div class="stat-num">{{ operations.length }}</div>
            <div class="stat-label">Toplam Aktif Sefer</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper amber">⏱️</div>
          <div class="stat-details">
            <div class="stat-num">{{ inProgressCount }}</div>
            <div class="stat-label">Dönüşte (Turnaround)</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper green">✅</div>
          <div class="stat-details">
            <div class="stat-num">{{ onTimePercentage }}%</div>
            <div class="stat-label">Zamanında Kalkış Oranı</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper purple">🚪</div>
          <div class="stat-details">
            <div class="stat-num">{{ delayedCount }}</div>
            <div class="stat-label">Gecikmeli Sefer</div>
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
            placeholder="Uçuş No (TK1821), Kuyruk (TC-JHK), Kapı (A1) veya Model ara..."
            class="search-input"
          />
        </div>

        <div class="status-filters">
          <button class="filter-pill" [class.active]="selectedStatus === 'ALL'" (click)="selectedStatus = 'ALL'">
            Tümü ({{ operations.length }})
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'Scheduled'" (click)="selectedStatus = 'Scheduled'">
            Planlandı
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'InProgress'" (click)="selectedStatus = 'InProgress'">
            Turnaround Sürüyor
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'Delayed'" (click)="selectedStatus = 'Delayed'">
            Gecikmeli
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'Completed'" (click)="selectedStatus = 'Completed'">
            Tamamlandı
          </button>
        </div>
      </div>

      <!-- SEFERLER VE TURNAROUND LİSTESİ -->
      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>UÇUŞ & GÜZERGAH</th>
                <th>UÇAK / KUYRUK</th>
                <th>KAPI & PİST</th>
                <th>VARIŞ / KALKIŞ</th>
                <th>DURUM & GECİKME</th>
                <th style="text-align: right; min-width: 320px;">OPERASYONEL MODÜLLER</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let op of filteredOperations">
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="flight-tag">✈️ {{ op.flightNumber }}</span>
                  </div>
                  <div class="text-muted mt-1" style="font-size: 0.8rem;">
                    IST ➔ FRA / LHR / CDG
                  </div>
                </td>
                <td>
                  <strong class="text-white">{{ op.aircraftTailNumber }}</strong>
                  <div class="text-muted" style="font-size: 0.75rem;">{{ op.aircraftModel || 'Boeing 737-800' }}</div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-1">
                    <span class="gate-pill">🚪 {{ op.gateNo || 'Stand-101' }}</span>
                    <span class="runway-pill">🛫 {{ op.assignedRunwayCode || '35L' }}</span>
                  </div>
                </td>
                <td>
                  <div>{{ op.arrivalTime | date:'shortTime' }} - {{ op.departureTime | date:'shortTime' }}</div>
                  <small class="text-muted">{{ op.arrivalTime | date:'dd.MM.yyyy' }}</small>
                </td>
                <td>
                  <span class="badge" 
                    [class.badge-info]="op.status === 'Scheduled'"
                    [class.badge-warning]="op.status === 'InProgress'"
                    [class.badge-danger]="op.status === 'Delayed' || op.delayMinutes > 0"
                    [class.badge-success]="op.status === 'Completed'">
                    {{ op.status === 'InProgress' ? 'Dönüşte (Turnaround)' : op.status }}
                  </span>
                  <div *ngIf="op.delayMinutes > 0" class="text-danger mt-1" style="font-size: 0.75rem; font-weight: 600;">
                    +{{ op.delayMinutes }} dk Gecikme
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons-group">
                    <a 
                      [routerLink]="['/ops/turnaround', op.id]" 
                      class="btn btn-sm btn-primary action-btn" 
                      title="Harekat Memuru Turnaround Süreci"
                    >
                      ⏱️ Redcap
                    </a>
                    <a 
                      [routerLink]="['/ops/gate-agent', op.id]" 
                      class="btn btn-sm btn-info action-btn" 
                      title="Yolcu Hizmetleri & Biniş Ekranı"
                    >
                      🚶‍♂️ Gate Agent
                    </a>
                    <a 
                      [routerLink]="['/ops/loadsheet', op.id]" 
                      class="btn btn-sm btn-outline action-btn" 
                      title="Elektronik Yük ve Denge Formu"
                    >
                      ⚖️ Loadsheet
                    </a>
                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredOperations.length === 0">
                <td colspan="6" class="text-center py-5 text-muted">
                  Arama kriterlerine uygun uçuş operasyonu bulunamadı.
                </td>
              </tr>
            </tbody>
          </table>
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
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
    }

    /* GRID */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    /* STAT CARD */
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
    .stat-icon-wrapper.amber { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }
    .stat-icon-wrapper.purple { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); }

    .stat-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* FILTER BAR */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .search-input-wrapper {
      position: relative;
      flex: 1;
      min-width: 280px;
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
      padding: 0.6rem 0.8rem 0.6rem 2.2rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: #00d4ff;
      background: rgba(30, 41, 59, 0.9);
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
    }

    .status-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.45rem 0.85rem;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .filter-pill.active {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      color: #00d4ff;
      font-weight: 700;
    }

    /* DATA TABLE */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th {
      padding: 0.85rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .data-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(0, 212, 255, 0.03);
    }

    .flight-tag {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(0, 212, 255, 0.12);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      color: #00d4ff;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .gate-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .runway-pill {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .action-buttons-group {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .action-btn {
      font-size: 0.75rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .action-btn:hover {
      transform: translateY(-1px);
    }

    .btn-info {
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid #38bdf8;
      color: #38bdf8;
    }
    .btn-info:hover {
      background: rgba(56, 189, 248, 0.35);
      color: #fff;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-info { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    .py-5 { padding-top: 3rem; padding-bottom: 3rem; }
  `]
})
export class OperationsComponent implements OnInit {
  operations: any[] = [];
  searchQuery = '';
  selectedStatus = 'ALL';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadOps();
  }

  loadOps() {
    this.api.getOperations(1, 50).subscribe(res => {
      if (res.success && res.data) {
        this.operations = res.data.items || [];
      }
    });
  }

  get inProgressCount(): number {
    return this.operations.filter(o => o.status === 'InProgress').length;
  }

  get delayedCount(): number {
    return this.operations.filter(o => o.status === 'Delayed' || o.delayMinutes > 0).length;
  }

  get onTimePercentage(): number {
    if (this.operations.length === 0) return 100;
    const onTime = this.operations.filter(o => !o.delayMinutes || o.delayMinutes === 0).length;
    return Math.round((onTime / this.operations.length) * 100);
  }

  get filteredOperations(): any[] {
    return this.operations.filter(op => {
      const matchesSearch = !this.searchQuery || 
        op.flightNumber?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        op.aircraftTailNumber?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        op.gateNo?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        op.aircraftModel?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus = this.selectedStatus === 'ALL' || op.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }
}
