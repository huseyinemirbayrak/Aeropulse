import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';

@Component({
  selector: 'app-jet-bridges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="bridge-tag">PBB MATRIX</span>
            <h1 class="section-title mb-0">Passenger Boarding Bridge (PBB) Operations</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            Real-time terminal gate bridge telemetry, docking sensors, aircraft airbridge links, and automated stowage surveillance
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" (click)="loadBridges()">Refresh Matrix</button>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">TOTAL PBB BRIDGES</span>
            <span class="badge info">Terminal 1 Hub</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ bridges.length }}</span>
            <span class="stat-sub">Boarding Positions</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ availableCount }} Available</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">CONNECTED / DOCKED</span>
            <span class="badge success">Active Turns</span>
          </div>
          <div class="stat-main">
            <span class="stat-value" style="color: #0284c7;">{{ connectedCount }}</span>
            <span class="stat-sub">Boarding & Deboarding</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Canopy & floor seals locked</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">RESERVED INBOUND</span>
            <span class="badge warning">Approach</span>
          </div>
          <div class="stat-main">
            <span class="stat-value" style="color: #d97706;">{{ reservedCount }}</span>
            <span class="stat-sub">Inbound Aircraft Assigned</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Stand clear for docking</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">MAINTENANCE / WEATHER LOCK</span>
            <span class="badge" [ngClass]="maintCount > 0 ? 'badge-danger' : 'badge-success'">
              {{ maintCount > 0 ? 'Stowed Hold' : 'Nominal' }}
            </span>
          </div>
          <div class="stat-main">
            <span class="stat-value" [style.color]="maintCount > 0 ? '#dc2626' : '#16a34a'">{{ maintCount }}</span>
            <span class="stat-sub">Secured Positions</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill danger" *ngIf="maintCount > 0">High Wind or Servicing Hold</span>
            <span class="bar-pill available" *ngIf="maintCount === 0">Zero Bridge Outages</span>
          </div>
        </div>
      </div>

      <div class="glass-card mb-4 filter-bar">
        <div class="status-filters">
          <button class="filter-pill" [class.active]="statusFilter === 'ALL'" (click)="statusFilter = 'ALL'">
            All Positions ({{ bridges.length }})
          </button>
          <button class="filter-pill" [class.active]="statusFilter === 'Available'" (click)="statusFilter = 'Available'">
            Available ({{ availableCount }})
          </button>
          <button class="filter-pill" [class.active]="statusFilter === 'Connected'" (click)="statusFilter = 'Connected'">
            Connected ({{ connectedCount }})
          </button>
          <button class="filter-pill" [class.active]="statusFilter === 'Reserved'" (click)="statusFilter = 'Reserved'">
            Reserved ({{ reservedCount }})
          </button>
          <button class="filter-pill" [class.active]="statusFilter === 'UnderMaintenance'" (click)="statusFilter = 'UnderMaintenance'">
            Under Maintenance ({{ maintCount }})
          </button>
        </div>
      </div>

      <div class="grid grid-3">
        <div 
          *ngFor="let b of filteredBridges" 
          class="glass-card bridge-card"
          [ngClass]="getBridgeCardClass(b.statusCode)"
        >
          <div class="bridge-top d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="gate-code font-mono">{{ b.bridgeNo }}</span>
              <span class="terminal-tag font-mono">Terminal {{ b.terminalNo }}</span>
            </div>
            <span class="badge" [ngClass]="getBadgeClass(b.statusCode)">
              {{ b.statusCode }}
            </span>
          </div>

          <div class="bridge-body mb-3">
            <div *ngIf="b.currentAssignment" class="assignment-box">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="flight-no">FLT {{ b.currentAssignment.flightNumber }}</span>
                <span class="tail-no font-mono">{{ b.currentAssignment.aircraftTailNumber }}</span>
              </div>
              <div class="eta-line text-muted" style="font-size: 0.75rem;">
                ETA: {{ b.currentAssignment.estimatedArrivalTime | date:'shortTime' }} • Assigned Stand
              </div>
            </div>

            <div *ngIf="!b.currentAssignment" class="empty-assignment">
              <span class="text-muted" style="font-size: 0.8125rem;">
                {{ b.statusCode === 'UnderMaintenance' ? 'Secured per safety/lockdown protocol' : 'Standby / Ready for Inbound Aircraft' }}
              </span>
            </div>
          </div>

          <div class="bridge-footer d-flex justify-content-between align-items-center pt-2 border-top">
            <small class="text-muted font-mono" style="font-size: 0.6875rem;">
              {{ b.statusCode === 'UnderMaintenance' ? 'Stowed Position Locked' : 'Auto-level Sensors Nominal' }}
            </small>
            <button 
              class="btn btn-sm btn-outline"
              *ngIf="b.statusCode === 'Available'"
              (click)="reserveBridge(b)"
            >
              Assign Stand
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bridge-tag {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .glass-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .stat-main {
      margin-bottom: 0.75rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
      display: block;
    }

    .stat-sub {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .stat-footer-bar {
      border-top: 1px solid #f1f5f9;
      padding-top: 0.5rem;
    }

    .bar-pill {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .bar-pill.available { background: #f0fdf4; color: #166534; }
    .bar-pill.danger { background: #fef2f2; color: #991b1b; }

    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .status-filters {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .filter-pill.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }

    .bridge-card {
      border-left: 4px solid #cbd5e1;
      transition: box-shadow 0.15s ease, transform 0.15s ease;
    }
    .bridge-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06);
    }
    .bridge-card.card-available { border-left-color: #16a34a; }
    .bridge-card.card-connected { border-left-color: #0284c7; }
    .bridge-card.card-reserved { border-left-color: #d97706; }
    .bridge-card.card-maintenance { border-left-color: #dc2626; background: #fffdfd; }

    .gate-code {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f172a;
    }

    .terminal-tag {
      font-size: 0.6875rem;
      padding: 2px 6px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      color: #64748b;
    }

    .assignment-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.75rem;
    }

    .flight-no {
      font-weight: 800;
      color: #0284c7;
    }

    .tail-no {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #334155;
    }

    .empty-assignment {
      padding: 0.75rem 0;
    }

    .border-top {
      border-top: 1px solid #f1f5f9;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .badge.badge-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .badge.badge-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge.badge-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge.badge-info { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }

    .font-mono { font-family: monospace; }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.8125rem;
      border: 1px solid transparent;
    }
    .btn-primary { background: #0284c7; color: #ffffff; }
    .btn-primary:hover { background: #0369a1; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
  `]
})
export class JetBridgesComponent implements OnInit {
  bridges: any[] = [];
  statusFilter = 'ALL';

  constructor(
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadBridges();
  }

  loadBridges(): void {
    this.api.getJetBridges().subscribe(res => {
      if (res.success) this.bridges = res.data;
    });
  }

  get filteredBridges(): any[] {
    if (this.statusFilter === 'ALL') return this.bridges;
    return this.bridges.filter(b => b.statusCode === this.statusFilter);
  }

  get availableCount(): number {
    return this.bridges.filter(b => b.statusCode === 'Available').length;
  }

  get connectedCount(): number {
    return this.bridges.filter(b => b.statusCode === 'Connected').length;
  }

  get reservedCount(): number {
    return this.bridges.filter(b => b.statusCode === 'Reserved').length;
  }

  get maintCount(): number {
    return this.bridges.filter(b => b.statusCode === 'UnderMaintenance').length;
  }

  getBridgeCardClass(status: string): string {
    switch (status) {
      case 'Available': return 'card-available';
      case 'Connected': return 'card-connected';
      case 'Reserved': return 'card-reserved';
      case 'UnderMaintenance': return 'card-maintenance';
      default: return '';
    }
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'Available': return 'badge-success';
      case 'Connected': return 'badge-info';
      case 'Reserved': return 'badge-warning';
      case 'UnderMaintenance': return 'badge-danger';
      default: return 'badge-info';
    }
  }

  reserveBridge(bridge: any): void {
    this.notification.info(`Bridge ${bridge.bridgeNo} standby verified for apron assignment.`);
  }
}
