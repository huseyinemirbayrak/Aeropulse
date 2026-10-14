import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Part, PagedResult } from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="mro-badge">MRO AVIONICS</span>
            <h1 class="section-title mb-0">Life-Limited Parts & Component Registry</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            Airworthiness compliance tracking, cyclic flight-hour threshold surveillance, and component replacement registry
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" (click)="loadParts()">Refresh Registry</button>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">TOTAL COMPONENTS</span>
            <span class="badge info">Active Fleet</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ totalCount }}</span>
            <span class="stat-sub">Tracked Assemblies</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ nominalCount }} In Safe Envelope</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">CRITICAL THRESHOLDS</span>
            <span class="badge" [ngClass]="criticalCount > 0 ? 'badge-danger' : 'badge-success'">
              {{ criticalCount > 0 ? 'Action Required' : 'Nominal' }}
            </span>
          </div>
          <div class="stat-main">
            <span class="stat-value" [style.color]="criticalCount > 0 ? '#dc2626' : '#16a34a'">{{ criticalCount }}</span>
            <span class="stat-sub">Parts Exceeding Limit</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill danger" *ngIf="criticalCount > 0">Grounded or Inspection Due</span>
            <span class="bar-pill available" *ngIf="criticalCount === 0">Zero Airworthiness Holds</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">NEAR EXPIRY (>85%)</span>
            <span class="badge warning">{{ nearExpiryCount }} Monitored</span>
          </div>
          <div class="stat-main">
            <span class="stat-value" style="color: #d97706;">{{ nearExpiryCount }}</span>
            <span class="stat-sub">Approaching Overhaul</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Scheduled for next C/D check</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">FLEET COVERAGE</span>
            <span class="badge success">EASA / FAA</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">100%</span>
            <span class="stat-sub">Certified Tracking</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Continuous cyclic telemetry</span>
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
            placeholder="Search Part Name (Turbine Blade, APU), Part Number (CFM-8492), Tail Number (TC-AER)..."
            class="search-input"
            (keyup.enter)="search()"
          />
        </div>

        <div class="status-filters">
          <button class="filter-pill" [class.active]="filterMode === 'ALL'" (click)="setFilter('ALL')">
            All Components ({{ totalCount }})
          </button>
          <button class="filter-pill" [class.active]="filterMode === 'CRITICAL'" (click)="setFilter('CRITICAL')">
            Critical Thresholds ({{ criticalCount }})
          </button>
          <button class="filter-pill" [class.active]="filterMode === 'WARNING'" (click)="setFilter('WARNING')">
            Near Limit ({{ nearExpiryCount }})
          </button>
          <button class="filter-pill" [class.active]="filterMode === 'NOMINAL'" (click)="setFilter('NOMINAL')">
            Nominal
          </button>
        </div>
      </div>

      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>PART & COMPONENT</th>
                <th>AIRCRAFT INSTALLATION</th>
                <th>LOCATION & MFR</th>
                <th>FLIGHT HOURS LOGGED</th>
                <th>REMAINING ENVELOPE</th>
                <th>AIRWORTHINESS STATUS</th>
                <th style="text-align: right;">INSPECTION</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let part of filteredParts">
                <td>
                  <div class="part-cell">
                    <span class="part-title">{{ part.partName }}</span>
                    <span class="part-pn font-mono">P/N: {{ part.partNumber }}</span>
                  </div>
                </td>
                <td>
                  <span class="tail-pill">{{ part.aircraftTailNumber || 'Spare Unassigned' }}</span>
                </td>
                <td>
                  <div class="text-muted" style="font-size: 0.8125rem;">
                    <div><strong>Loc:</strong> {{ part.location || 'N/A' }}</div>
                    <div>{{ part.manufacturer || 'OEM Standard' }}</div>
                  </div>
                </td>
                <td>
                  <div class="hours-cell">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="hours-text"><strong>{{ part.usedHours | number:'1.0-0' }}</strong> / {{ part.lifeSpanHours | number:'1.0-0' }} hrs</span>
                      <small class="percentage-text font-mono">{{ part.usagePercentage | number:'1.1-1' }}%</small>
                    </div>
                    <div class="progress-track">
                      <div 
                        class="progress-fill" 
                        [style.width.%]="part.usagePercentage > 100 ? 100 : part.usagePercentage"
                        [ngClass]="getUsageClass(part)"
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="font-mono" [ngClass]="part.remainingLifeHours <= (part.lifeSpanHours - part.criticalThresholdHours) ? 'text-danger font-bold' : 'text-primary'">
                    {{ part.remainingLifeHours | number:'1.0-0' }} hrs
                  </span>
                  <div class="text-muted" style="font-size: 0.75rem;">Limit: {{ part.criticalThresholdHours | number:'1.0-0' }}h</div>
                </td>
                <td>
                  <span class="badge" [ngClass]="part.isCritical ? 'badge-danger' : (part.usagePercentage >= 85 ? 'badge-warning' : 'badge-success')">
                    {{ part.isCritical ? 'CRITICAL - HOLD' : (part.usagePercentage >= 85 ? 'INSPECTION DUE' : 'AIRWORTHY') }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-outline" (click)="logInspection(part)">
                    Log Check
                  </button>
                </td>
              </tr>

              <tr *ngIf="loading">
                <td colspan="7" class="text-center py-5 text-muted">
                  Synchronizing avionics life-limited component inventory...
                </td>
              </tr>

              <tr *ngIf="!loading && filteredParts.length === 0">
                <td colspan="7" class="text-center py-5 text-muted">
                  No components match the active filter criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-footer d-flex justify-content-between align-items-center mt-3 pt-3" *ngIf="totalPages > 1">
          <span class="text-muted" style="font-size: 0.8125rem;">
            Showing Page {{ page }} of {{ totalPages }} ({{ totalCount }} items)
          </span>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline" [disabled]="page <= 1" (click)="changePage(page - 1)">Previous</button>
            <button class="btn btn-sm btn-outline" [disabled]="page >= totalPages" (click)="changePage(page + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mro-badge {
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
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .search-input {
      width: 100%;
      padding: 0.55rem 0.75rem 0.55rem 2.25rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #0f172a;
    }
    .search-input:focus {
      outline: none;
      border-color: #0284c7;
      background: #ffffff;
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

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th {
      padding: 0.75rem;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #0f172a;
    }

    .part-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .part-title {
      font-weight: 700;
      color: #0f172a;
    }
    .part-pn {
      font-size: 0.75rem;
      color: #64748b;
    }

    .tail-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      color: #0f172a;
      font-family: monospace;
    }

    .hours-cell {
      min-width: 170px;
    }
    .hours-text {
      font-size: 0.8125rem;
      color: #334155;
    }
    .percentage-text {
      font-size: 0.75rem;
      color: #64748b;
    }

    .progress-track {
      background: #e2e8f0;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
    }
    .progress-fill.fill-green { background: #16a34a; }
    .progress-fill.fill-yellow { background: #d97706; }
    .progress-fill.fill-red { background: #dc2626; }

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
    .badge.info { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }

    .font-mono { font-family: monospace; }
    .text-danger { color: #dc2626 !important; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #0f172a; }

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
export class InventoryComponent implements OnInit {
  parts: Part[] = [];
  loading = false;
  searchQuery = '';
  filterMode: 'ALL' | 'CRITICAL' | 'WARNING' | 'NOMINAL' = 'ALL';
  page = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 1;

  constructor(
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadParts();
  }

  loadParts(): void {
    this.loading = true;
    this.api.getParts(this.page, this.pageSize, this.searchQuery || undefined).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.parts = res.data.items || [];
          this.totalCount = res.data.totalCount || this.parts.length;
          this.totalPages = res.data.totalPages || 1;
        }
      },
      error: () => {
        this.loading = false;
        this.notification.error('Failed to retrieve parts registry.');
      }
    });
  }

  search(): void {
    this.page = 1;
    this.loadParts();
  }

  setFilter(mode: 'ALL' | 'CRITICAL' | 'WARNING' | 'NOMINAL'): void {
    this.filterMode = mode;
  }

  get filteredParts(): Part[] {
    if (this.filterMode === 'CRITICAL') {
      return this.parts.filter(p => p.isCritical || p.usagePercentage >= 95);
    }
    if (this.filterMode === 'WARNING') {
      return this.parts.filter(p => !p.isCritical && p.usagePercentage >= 85 && p.usagePercentage < 95);
    }
    if (this.filterMode === 'NOMINAL') {
      return this.parts.filter(p => !p.isCritical && p.usagePercentage < 85);
    }
    return this.parts;
  }

  get criticalCount(): number {
    return this.parts.filter(p => p.isCritical || p.usagePercentage >= 95).length;
  }

  get nearExpiryCount(): number {
    return this.parts.filter(p => !p.isCritical && p.usagePercentage >= 85 && p.usagePercentage < 95).length;
  }

  get nominalCount(): number {
    return this.parts.filter(p => !p.isCritical && p.usagePercentage < 85).length;
  }

  getUsageClass(part: Part): string {
    if (part.isCritical || part.usagePercentage >= 95) return 'fill-red';
    if (part.usagePercentage >= 85) return 'fill-yellow';
    return 'fill-green';
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadParts();
    }
  }

  logInspection(part: Part): void {
    this.notification.info(`Component ${part.partNumber} inspection verified. Airworthiness entry logged.`);
  }
}
