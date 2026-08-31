import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { AdminDashboard } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard" *ngIf="data; else loadingTpl">
      <!-- Stats Grid -->
      <div class="grid grid-4 stagger">
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(0, 212, 255, 0.15); color: var(--accent-primary);">✈</div>
          <div class="stat-value">{{ data.totalAircraft }}</div>
          <div class="stat-label">Total Aircraft</div>
          <div class="stat-sub">{{ data.activeAircraft }} active</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--color-warning);">🔧</div>
          <div class="stat-value">{{ data.inMaintenanceAircraft }}</div>
          <div class="stat-label">In Maintenance</div>
          <div class="stat-sub">{{ data.totalMaintenanceRecords }} total records</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(239, 68, 68, 0.15); color: var(--color-danger);">⚠</div>
          <div class="stat-value">{{ data.openFaults }}</div>
          <div class="stat-label">Open Faults</div>
          <div class="stat-sub">{{ data.criticalFaults }} critical</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(124, 58, 237, 0.15); color: var(--accent-secondary);">👥</div>
          <div class="stat-value">{{ data.totalUsers }}</div>
          <div class="stat-label">Active Users</div>
          <div class="stat-sub">{{ data.slaBreaches }} SLA breaches</div>
        </div>
      </div>

      <!-- Critical Alerts -->
      <div class="alerts-row" *ngIf="data.slaBreaches > 0 || data.criticalParts > 0">
        <div class="alert-banner danger" *ngIf="data.slaBreaches > 0">
          <span>🚨</span> {{ data.slaBreaches }} fault report(s) have exceeded SLA resolution time
        </div>
        <div class="alert-banner warning" *ngIf="data.criticalParts > 0">
          <span>⚡</span> {{ data.criticalParts }} part(s) have reached critical threshold
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="grid grid-2 mt-3">
        <!-- Aircraft Status Summary -->
        <div class="glass-card">
          <h3 class="section-title">Aircraft Fleet Status</h3>
          <div class="status-bars">
            @for (s of data.aircraftStatusSummary; track s.statusName) {
              <div class="status-row">
                <div class="status-label">
                  <span class="status-dot" [class]="getStatusClass(s.statusName)"></span>
                  {{ s.statusName }}
                </div>
                <div class="status-bar-wrapper">
                  <div class="progress-bar">
                    <div class="progress-fill" [class]="getBarClass(s.statusName)"
                         [style.width.%]="getPercent(s.count)"></div>
                  </div>
                </div>
                <span class="status-count">{{ s.count }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Recent Faults -->
        <div class="glass-card">
          <h3 class="section-title">Recent Fault Reports</h3>
          <div class="fault-list">
            @for (f of data.recentFaults; track f.id) {
              <div class="fault-item">
                <div class="fault-header">
                  <span class="badge" [class]="getPriorityBadge(f.priority)">{{ f.priority }}</span>
                  <span class="fault-tail">{{ f.aircraftTailNumber }}</span>
                </div>
                <div class="fault-desc">{{ f.description | slice:0:80 }}{{ f.description.length > 80 ? '...' : '' }}</div>
                <div class="fault-meta">
                  <span class="badge" [class]="getStatusBadge(f.status)">{{ f.status }}</span>
                  <span class="fault-date">{{ f.openDate | date:'short' }}</span>
                </div>
              </div>
            }
            <div class="empty-state" *ngIf="data.recentFaults.length === 0">
              <p>No recent faults</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-page">
        <div class="loading-spinner"></div>
        <p style="color: var(--text-muted);">Loading dashboard...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .stat-sub {
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .alerts-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .alert-banner {
      padding: 0.875rem 1.25rem;
      border-radius: var(--border-radius-sm);
      font-weight: 500;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: fadeIn 0.5s ease;
    }

    .alert-banner.danger {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--color-danger);
    }

    .alert-banner.warning {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: var(--color-warning);
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      color: var(--text-primary);
    }

    .status-bars {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-label {
      min-width: 140px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.active { background: var(--color-success); }
    .status-dot.maintenance { background: var(--color-warning); }
    .status-dot.grounded { background: var(--color-danger); }
    .status-dot.retired { background: var(--text-muted); }

    .status-bar-wrapper {
      flex: 1;
    }

    .status-count {
      min-width: 30px;
      text-align: right;
      font-weight: 700;
      color: var(--text-primary);
    }

    .fault-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 350px;
      overflow-y: auto;
    }

    .fault-item {
      padding: 0.875rem;
      background: rgba(0, 212, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: var(--border-radius-sm);
      transition: all var(--transition-fast);
    }

    .fault-item:hover {
      border-color: var(--border-active);
      background: rgba(0, 212, 255, 0.06);
    }

    .fault-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }

    .fault-tail {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--accent-primary);
    }

    .fault-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    .fault-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .fault-date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  data: AdminDashboard | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAdminDashboard().subscribe(res => {
      if (res.success) this.data = res.data;
    });
  }

  getPercent(count: number): number {
    if (!this.data) return 0;
    return Math.max(5, (count / this.data.totalAircraft) * 100);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Active': return 'active';
      case 'InMaintenance': return 'maintenance';
      case 'Grounded': return 'grounded';
      case 'Retired': return 'retired';
      default: return '';
    }
  }

  getBarClass(status: string): string {
    switch (status) {
      case 'Active': return 'green';
      case 'InMaintenance': return 'yellow';
      case 'Grounded': return 'red';
      default: return 'green';
    }
  }

  getPriorityBadge(priority: string): string {
    switch (priority) {
      case 'Critical': return 'badge-critical';
      case 'High': return 'badge-danger';
      case 'Medium': return 'badge-warning';
      case 'Low': return 'badge-info';
      default: return 'badge-default';
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'Open': return 'badge-danger';
      case 'UnderReview': return 'badge-warning';
      case 'Resolved': return 'badge-success';
      case 'Closed': return 'badge-default';
      default: return 'badge-default';
    }
  }
}
