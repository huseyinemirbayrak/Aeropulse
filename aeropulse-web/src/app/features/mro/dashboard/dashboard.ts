import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { MRODashboard } from '../../../core/models';

@Component({
  selector: 'app-mro-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard" *ngIf="data; else loadingTpl">
      <div class="grid grid-4 stagger">
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(239, 68, 68, 0.12); color: var(--color-danger);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </div>
          <div class="stat-value">{{ data.myOpenTasks }}</div>
          <div class="stat-label">Assigned Open Orders</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--color-success);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-value">{{ data.completedThisMonth }}</div>
          <div class="stat-label">Released This Month</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.12); color: var(--color-warning);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="stat-value">{{ data.criticalPartsCount }}</div>
          <div class="stat-label">Life-Limited (LLP) Alerts</div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-icon" style="background: rgba(59, 130, 246, 0.12); color: var(--color-info);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div class="stat-value">{{ data.pendingMaintenanceCount }}</div>
          <div class="stat-label">Scheduled Inspections</div>
        </div>
      </div>

      <div class="grid grid-2 mt-3">
        <div class="glass-card">
          <h3 class="section-title">Upcoming Maintenance</h3>
          <div class="list-container">
            @for (m of data.upcomingMaintenance; track m.id) {
              <div class="list-item">
                <div class="item-header">
                  <span class="tail-number">{{ m.aircraftTailNumber }}</span>
                  <span class="date">{{ m.nextScheduledDate | date:'mediumDate' }}</span>
                </div>
                <div class="item-desc">{{ m.workPerformed }}</div>
                <div class="badge badge-info mt-1">{{ m.maintenanceTypeName }}</div>
              </div>
            }
            <div class="empty-state" *ngIf="data.upcomingMaintenance.length === 0">
              <p>No upcoming maintenance scheduled.</p>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <h3 class="section-title">Critical Parts (Action Required)</h3>
          <div class="list-container">
            @for (p of data.criticalParts; track p.id) {
              <div class="list-item border-danger">
                <div class="item-header">
                  <span class="part-name">{{ p.partName }} ({{ p.partNumber }})</span>
                  <span class="tail-number">{{ p.aircraftTailNumber }}</span>
                </div>
                <div class="progress-section mt-1">
                  <div class="progress-labels">
                    <span>Usage</span>
                    <span>{{ p.usedHours }} / {{ p.lifeSpanHours }} hrs</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill red" [style.width.%]="p.usagePercentage"></div>
                  </div>
                </div>
              </div>
            }
            <div class="empty-state" *ngIf="data.criticalParts.length === 0">
              <p>No critical parts found. Fleet is healthy.</p>
            </div>
          </div>
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
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      color: var(--text-primary);
    }
    
    .list-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .list-item {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--border-radius-sm);
    }

    .list-item.border-danger {
      border-left: 3px solid var(--color-danger);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .tail-number {
      font-weight: 700;
      color: var(--accent-primary);
    }

    .date {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .part-name {
      font-weight: 600;
    }

    .item-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
  `]
})
export class MRODashboardComponent implements OnInit {
  data: MRODashboard | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMRODashboard().subscribe(res => {
      if (res.success) this.data = res.data;
    });
  }
}
