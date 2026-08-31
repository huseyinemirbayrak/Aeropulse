import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { AdminDashboard } from '../../../core/models';

@Component({
  selector: 'app-viewer-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard" *ngIf="data; else loadingTpl">
      <div class="page-header">
        <div>
          <h1>Operations Overview</h1>
          <p class="subtitle">Read-only view of current airport and fleet status</p>
        </div>
      </div>
      
      <div class="grid grid-4 stagger">
        <div class="stat-card animate-fade-in">
          <div class="stat-value">{{ data.totalAircraft }}</div>
          <div class="stat-label">Total Aircraft</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-value" [style.color]="data.activeAircraft > 0 ? 'var(--color-success)' : ''">{{ data.activeAircraft }}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-value" [style.color]="data.inMaintenanceAircraft > 0 ? 'var(--color-warning)' : ''">{{ data.inMaintenanceAircraft }}</div>
          <div class="stat-label">In Maintenance</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-value" [style.color]="data.openFaults > 0 ? 'var(--color-danger)' : ''">{{ data.openFaults }}</div>
          <div class="stat-label">Open Faults</div>
        </div>
      </div>

      <div class="glass-card mt-3">
        <h3>Fleet Status Distribution</h3>
        <div class="status-grid mt-2">
          @for (s of data.aircraftStatusSummary; track s.statusName) {
            <div class="status-box">
              <div class="status-name">{{ s.statusName }}</div>
              <div class="status-count">{{ s.count }}</div>
            </div>
          }
        </div>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-page">
        <div class="loading-spinner"></div>
      </div>
    </ng-template>
  `,
  styles: [`
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    
    .status-box {
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      padding: 1.5rem;
      text-align: center;
    }
    
    .status-name {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    
    .status-count {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-primary);
    }
  `]
})
export class ViewerDashboardComponent implements OnInit {
  data: AdminDashboard | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getViewerDashboard().subscribe(res => {
      if (res.success) this.data = res.data;
    });
  }
}
