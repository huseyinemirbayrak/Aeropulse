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
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="fleet-badge">GSE</span>
            <h1 class="section-title mb-0">Ground Support Equipment (GSE) Fleet</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            Real-time ramp telemetry for transit buses, hydrant dispensers, baggage tugs, and pushback tractors
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" (click)="loadGSE()">Refresh Fleet</button>
          <a class="btn btn-outline" routerLink="/ops/dashboard">Radar View</a>
          <a class="btn btn-secondary" routerLink="/ops/ramp">Ramp Dispatch</a>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="stat-details">
            <div class="stat-num">{{ gseList.length }}</div>
            <div class="stat-label">Total Fleet Units</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-details">
            <div class="stat-num">{{ idleCount }}</div>
            <div class="stat-label">Standby / Available</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-details">
            <div class="stat-num">{{ busyCount }}</div>
            <div class="stat-label">Active on Ramp</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="stat-details">
            <div class="stat-num">{{ outOfServiceCount }}</div>
            <div class="stat-label">Maintenance / OOS</div>
          </div>
        </div>
      </div>

      <div class="glass-card mb-4 filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search GSE Code (BUS-01, TANKER-01), Operator, or Apron Zone..."
            class="search-input"
          />
        </div>

        <div class="type-filters">
          <button class="filter-pill" [class.active]="selectedType === 'ALL'" (click)="selectedType = 'ALL'">
            All Types ({{ gseList.length }})
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'PassengerBus'" (click)="selectedType = 'PassengerBus'">
            Buses
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'FuelTanker'" (click)="selectedType = 'FuelTanker'">
            Fuel Tankers
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'BaggageTug'" (click)="selectedType = 'BaggageTug'">
            Baggage Tugs
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'PushbackTruck'" (click)="selectedType = 'PushbackTruck'">
            Pushback Tractors
          </button>
        </div>

        <div class="status-filters">
          <button class="status-pill-btn" [class.active]="selectedStatus === 'ALL'" (click)="selectedStatus = 'ALL'">
            All Statuses
          </button>
          <button class="status-pill-btn idle" [class.active]="selectedStatus === 'Idle'" (click)="selectedStatus = 'Idle'">
            Standby ({{ idleCount }})
          </button>
          <button class="status-pill-btn busy" [class.active]="selectedStatus === 'Busy'" (click)="selectedStatus = 'Busy'">
            Active ({{ busyCount }})
          </button>
          <button class="status-pill-btn out" [class.active]="selectedStatus === 'OutOfService'" (click)="selectedStatus = 'OutOfService'">
            Maintenance ({{ outOfServiceCount }})
          </button>
        </div>
      </div>

      <div class="gse-grid">
        <div *ngFor="let vehicle of filteredGSE" class="glass-card vehicle-card" [ngClass]="getCardStatusClass(vehicle.status)">
          <div class="vehicle-card-top">
            <div class="d-flex align-items-center gap-2">
              <span class="vehicle-icon-box">{{ getVehicleTypeIcon(vehicle.type) }}</span>
              <div>
                <h3 class="vehicle-code mb-0">{{ vehicle.code }}</h3>
                <span class="vehicle-type-text">{{ getVehicleTypeName(vehicle.type) }}</span>
              </div>
            </div>

            <span class="badge" [ngClass]="getStatusBadgeClass(vehicle.status)">
              {{ getStatusText(vehicle.status) }}
            </span>
          </div>

          <p class="vehicle-name text-white mt-3 mb-2 font-weight-bold">
            {{ vehicle.name }}
          </p>

          <div *ngIf="vehicle.status === 1" class="task-info-box busy-box mb-3">
            <span class="box-label">CURRENT ASSIGNMENT:</span>
            <div class="task-desc">
              {{ vehicle.currentTaskDescription || 'Turnaround Ramp Operation' }}
            </div>
          </div>

          <div *ngIf="vehicle.status === 2" class="task-info-box out-of-service-box mb-3">
            <span class="box-label">DEFECT / MAINTENANCE LOG:</span>
            <div class="task-desc text-danger font-weight-bold">
              {{ vehicle.currentTaskDescription || 'Maintenance Hold / Locked from Dispatch' }}
            </div>
          </div>

          <div class="vehicle-meta-grid mb-3">
            <div class="meta-item">
              <span class="meta-label">APRON ZONE</span>
              <strong class="meta-val">{{ vehicle.apronZone || 'Terminal 1 Ramp' }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">DESIGNATED OPERATOR</span>
              <strong class="meta-val">{{ vehicle.operatorName || 'Unassigned' }}</strong>
            </div>
          </div>

          <div class="fuel-section mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fuel-label">
                {{ vehicle.type === 4 ? 'Battery / Charge Level' : 'Fuel / Energy Level' }}
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

          <div class="vehicle-actions">
            <button class="btn btn-sm btn-outline flex-grow-1" (click)="openStatusModal(vehicle)">
              Update Telemetry
            </button>
            <button 
              class="btn btn-sm btn-secondary" 
              (click)="refuelVehicle(vehicle)"
              [disabled]="vehicle.fuelLevelPercentage >= 100"
              title="Refuel unit to 100%"
            >
              Refuel (100%)
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="filteredGSE.length === 0" class="glass-card text-center py-5">
        <p class="text-muted mb-0">No GSE equipment matched the specified filter criteria.</p>
      </div>

      <div class="modal-backdrop" *ngIf="showModal">
        <div class="modal-content glass-card animate-fade-in">
          <div class="modal-header">
            <h3>{{ selectedVehicle?.code }} — GSE Allocation & Telemetry</h3>
            <button class="close-btn" (click)="closeStatusModal()">✕</button>
          </div>

          <div class="modal-body" *ngIf="selectedVehicle">
            <p class="text-muted mb-3">
              Configure operational state, apron stand position, and fuel status for {{ selectedVehicle.name }}.
            </p>

            <div class="form-group mb-3">
              <label class="form-label">Operational Status</label>
              <div class="status-select-grid">
                <button 
                  type="button"
                  class="status-opt-btn" 
                  [class.selected]="modalStatus === 0"
                  (click)="modalStatus = 0"
                >
                  Standby (Idle)
                </button>
                <button 
                  type="button"
                  class="status-opt-btn" 
                  [class.selected]="modalStatus === 1"
                  (click)="modalStatus = 1"
                >
                  Active (Busy)
                </button>
                <button 
                  type="button"
                  class="status-opt-btn danger-opt" 
                  [class.selected]="modalStatus === 2"
                  (click)="modalStatus = 2"
                >
                  Maintenance (OOS)
                </button>
              </div>
            </div>

            <div class="form-group mb-3" *ngIf="modalStatus === 2">
              <div class="out-warning-alert mb-2">
                <strong>Safety Hold:</strong> Setting this unit to Out of Service prevents dispatch to turnaround tasks.
              </div>
              <label class="form-label">Maintenance / Defect Reason</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="modalTaskDescription"
                placeholder="e.g. Brake hydraulic leak / Hangar inspection"
              />
            </div>

            <div class="form-group mb-3" *ngIf="modalStatus === 1">
              <label class="form-label">Active Task Assignment</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="modalTaskDescription"
                placeholder="e.g. TK1984 Refueling (8,500 kg)"
              />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Apron Zone / Stand Position</label>
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="modalApronZone"
                placeholder="e.g. Gate A1, Stand-102, West Remote"
              />
            </div>

            <div class="form-group mb-4">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label mb-0">Fuel / Charge Level (%)</label>
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
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeStatusModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveStatusChanges()" [disabled]="modalSaving">
              {{ modalSaving ? 'Saving...' : 'Save Configuration' }}
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
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .d-flex { display: flex; }
    .align-items-center { align-items: center; }
    .justify-content-between { justify-content: space-between; }
    .gap-2 { gap: 0.5rem; }
    .mb-0 { margin-bottom: 0; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-3 { margin-top: 0.75rem; }
    .w-100 { width: 100%; }
    .flex-grow-1 { flex-grow: 1; }

    .fleet-badge {
      padding: 3px 8px;
      border-radius: 4px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0284c7;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
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
      flex-wrap: wrap;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .stat-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
    }
    .stat-icon-wrapper.blue { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
    .stat-icon-wrapper.green { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .stat-icon-wrapper.amber { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .stat-icon-wrapper.red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

    .stat-num {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }

    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.25rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
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
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .search-input {
      width: 100%;
      padding: 0.55rem 0.8rem 0.55rem 2.2rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #0f172a;
      font-size: 0.875rem;
      outline: none;
      box-sizing: border-box;
    }

    .type-filters, .status-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill, .status-pill-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .filter-pill.active, .status-pill-btn.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }

    .gse-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .vehicle-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
    }

    .vehicle-card.idle-card { border-top: 3px solid #16a34a; }
    .vehicle-card.busy-card { border-top: 3px solid #f59e0b; }
    .vehicle-card.out-card { border-top: 3px solid #dc2626; }

    .vehicle-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .vehicle-icon-box {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 3px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      font-family: var(--font-mono, monospace);
    }

    .vehicle-code {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .vehicle-type-text {
      font-size: 0.6875rem;
      color: #64748b;
      font-weight: 600;
    }

    .vehicle-name {
      color: #0f172a !important;
      font-size: 0.875rem;
    }

    .task-info-box {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .busy-box { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .out-of-service-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

    .box-label {
      font-size: 0.625rem;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .vehicle-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: #f8fafc;
      padding: 0.5rem;
      border-radius: 6px;
    }

    .meta-label {
      font-size: 0.625rem;
      color: #64748b;
      display: block;
      font-weight: 600;
    }

    .meta-val {
      font-size: 0.75rem;
      color: #0f172a;
    }

    .fuel-label {
      font-size: 0.6875rem;
      color: #64748b;
      font-weight: 600;
    }

    .fuel-percentage {
      font-size: 0.75rem;
    }
    .fuel-percentage.high { color: #16a34a; }
    .fuel-percentage.medium { color: #d97706; }
    .fuel-percentage.low { color: #dc2626; }

    .fuel-track {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }

    .fuel-fill {
      height: 100%;
      border-radius: 3px;
    }
    .fuel-fill.high { background: #16a34a; }
    .fuel-fill.medium { background: #f59e0b; }
    .fuel-fill.low { background: #dc2626; }

    .vehicle-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
    }

    .status-select-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .status-opt-btn {
      padding: 0.5rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .status-opt-btn.selected {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }
    .status-opt-btn.danger-opt.selected {
      background: #dc2626;
      border-color: #dc2626;
      color: #ffffff;
    }

    .out-warning-alert {
      padding: 0.6rem 0.8rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: #991b1b;
      font-size: 0.75rem;
    }

    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .form-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 4px;
    }

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
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #0f172a;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
    }

    .modal-header h3 {
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: #64748b;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    .badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
    }
    .badge.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .badge.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge.danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge.secondary { background: #f1f5f9; color: #475569; }
  `]
})
export class GseFleetComponent implements OnInit, OnDestroy {
  gseList: any[] = [];
  searchQuery = '';
  selectedType = 'ALL';
  selectedStatus = 'ALL';

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
      error: (err) => console.error('Failed to load GSE fleet:', err)
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
      case 'PassengerBus': return 'BUS';
      case 'FuelTanker': return 'FUEL';
      case 'BaggageTug': return 'TUG';
      case 'PassengerStairs': return 'STRS';
      case 'PushbackTruck': return 'PUSH';
      case 'GPU': return 'GPU';
      default: return 'GSE';
    }
  }

  getVehicleTypeName(type: any): string {
    const t = this.normalizeType(type);
    switch (t) {
      case 'PassengerBus': return 'Passenger Transit Bus';
      case 'FuelTanker': return 'Hydrant / Fuel Tanker';
      case 'BaggageTug': return 'Baggage Tractor';
      case 'PassengerStairs': return 'Mobile Boarding Stairs';
      case 'PushbackTruck': return 'Pushback Tractor';
      case 'GPU': return 'Ground Power Unit (GPU)';
      default: return 'Support Equipment';
    }
  }

  getStatusText(status: any): string {
    const s = this.normalizeStatus(status);
    switch (s) {
      case 'Idle': return 'Standby (Ready)';
      case 'Busy': return 'Active on Ramp';
      case 'OutOfService': return 'Maintenance Hold';
      default: return 'Unknown';
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
          this.notification.success(`Unit ${this.selectedVehicle.code} telemetry updated.`);
          this.closeStatusModal();
        } else {
          this.notification.error(res.message || 'Update failed.');
        }
      },
      error: () => {
        this.modalSaving = false;
        this.notification.error('Server communication error.');
      }
    });
  }

  refuelVehicle(vehicle: any) {
    this.api.refuelGSE(vehicle.id).subscribe({
      next: (res) => {
        if (res.success) {
          vehicle.fuelLevelPercentage = 100;
          this.notification.success(`${vehicle.code} refueled / charged to 100%.`);
        }
      },
      error: () => this.notification.error('Refueling dispatch failed.')
    });
  }
}
