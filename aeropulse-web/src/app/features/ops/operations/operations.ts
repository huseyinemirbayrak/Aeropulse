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
      <div class="header-actions mb-4">
        <div>
          <h1 class="section-title mb-1">Flight & Turnaround Operations</h1>
          <p class="text-muted mb-0">Airside ground handling telemetry, turnaround milestone orchestration, and departure coordination</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary" (click)="loadOps()">Refresh Schedule</button>
          <a class="btn btn-outline" routerLink="/ops/dashboard">OCC Radar Console</a>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
          </div>
          <div class="stat-details">
            <div class="stat-num">{{ operations.length }}</div>
            <div class="stat-label">Active Air Movements</div>
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
            <div class="stat-num">{{ inProgressCount }}</div>
            <div class="stat-label">In Turnaround (Ramp)</div>
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
            <div class="stat-num">{{ onTimePercentage }}%</div>
            <div class="stat-label">On-Time Performance (OTP)</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="stat-details">
            <div class="stat-num">{{ delayedCount }}</div>
            <div class="stat-label">Delayed Flights</div>
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
            placeholder="Search Flight No (TK1821), Tail (TC-JHK), Gate (A1), or Aircraft..."
            class="search-input"
          />
        </div>

        <div class="status-filters">
          <button class="filter-pill" [class.active]="selectedStatus === 'ALL'" (click)="selectedStatus = 'ALL'">
            All ({{ operations.length }})
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'Scheduled'" (click)="selectedStatus = 'Scheduled'">
            Scheduled
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'InProgress'" (click)="selectedStatus = 'InProgress'">
            In Turnaround
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'Delayed'" (click)="selectedStatus = 'Delayed'">
            Delayed
          </button>
          <button class="filter-pill" [class.active]="selectedStatus === 'Completed'" (click)="selectedStatus = 'Completed'">
            Completed
          </button>
        </div>
      </div>

      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>FLIGHT & ROUTE</th>
                <th>AIRCRAFT</th>
                <th>GATE & RUNWAY</th>
                <th>SCHEDULE</th>
                <th>STATUS & DELAY</th>
                <th style="text-align: right; min-width: 320px;">DISPATCH MODULES</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let op of filteredOperations">
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="flight-tag">{{ op.flightNumber }}</span>
                  </div>
                  <div class="text-muted mt-1" style="font-size: 0.8rem;">
                    IST ➔ FRA / LHR / CDG
                  </div>
                </td>
                <td>
                  <strong>{{ op.aircraftTailNumber }}</strong>
                  <div class="text-muted" style="font-size: 0.75rem;">{{ op.aircraftModel || 'Commercial' }}</div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-1">
                    <span class="gate-pill">{{ op.gateNo || 'Stand-101' }}</span>
                    <span class="runway-pill">{{ op.assignedRunwayCode || '35L' }}</span>
                  </div>
                </td>
                <td>
                  <div>{{ op.arrivalTime | date:'shortTime' }} - {{ op.departureTime | date:'shortTime' }}</div>
                  <small class="text-muted">{{ op.arrivalTime | date:'mediumDate' }}</small>
                </td>
                <td>
                  <span class="badge" 
                    [class.badge-info]="op.status === 'Scheduled'"
                    [class.badge-warning]="op.status === 'InProgress'"
                    [class.badge-danger]="op.status === 'Delayed' || op.delayMinutes > 0"
                    [class.badge-success]="op.status === 'Completed'">
                    {{ op.status === 'InProgress' ? 'In Turnaround' : op.status }}
                  </span>
                  <div *ngIf="op.delayMinutes > 0" class="text-danger mt-1" style="font-size: 0.75rem; font-weight: 600;">
                    +{{ op.delayMinutes }}m Delay
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons-group">
                    <a 
                      [routerLink]="['/ops/turnaround', op.id]" 
                      class="btn btn-sm btn-primary action-btn" 
                      title="Turnaround Checklist"
                    >
                      Turnaround
                    </a>
                    <a 
                      [routerLink]="['/ops/gate-agent', op.id]" 
                      class="btn btn-sm btn-info action-btn" 
                      title="Gate Dispatch & Boarding"
                    >
                      Gate Agent
                    </a>
                    <a 
                      [routerLink]="['/ops/loadsheet', op.id]" 
                      class="btn btn-sm btn-outline action-btn" 
                      title="Weight & Balance Loadsheet"
                    >
                      Loadsheet
                    </a>
                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredOperations.length === 0">
                <td colspan="6" class="text-center py-5 text-muted">
                  No flight operations matched the specified filter criteria.
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
      font-family: 'Inter', -apple-system, sans-serif;
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
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
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
    .stat-icon-wrapper.amber { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .stat-icon-wrapper.green { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .stat-icon-wrapper.purple { background: #faf5ff; color: #9333ea; border: 1px solid #e9d5ff; }

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
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
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
    }

    .search-input:focus {
      border-color: #0284c7;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    }

    .status-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .filter-pill:hover {
      background: #e2e8f0;
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
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }

    .data-table th {
      padding: 0.75rem 1rem;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.6875rem;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #0f172a;
    }

    .data-table tr:hover td {
      background: #f8fafc;
    }

    .flight-tag {
      display: inline-block;
      padding: 3px 8px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 4px;
      color: #0284c7;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .gate-pill {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
    }

    .runway-pill {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .action-buttons-group {
      display: flex;
      justify-content: flex-end;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .action-btn {
      font-size: 0.75rem;
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
    }

    .btn-info {
      background: #0284c7;
      border: 1px solid #0284c7;
      color: #ffffff;
    }
    .btn-info:hover {
      background: #0369a1;
    }

    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover {
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
    }
    .badge-info { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
    .badge-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

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
