import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/api.service';
import { AdminDashboard } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dashboard-wrapper">
      <div class="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p class="subtitle">System Overview & Operations Management</p>
        </div>
        <button mat-raised-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <div class="loading-container" *ngIf="!data">
        <mat-spinner></mat-spinner>
        <p>Loading dashboard...</p>
      </div>

      <div class="dashboard-content" *ngIf="data">
        <mat-grid-list cols="4" rowHeight="160px" gutterSize="16px">
          <mat-grid-tile>
            <mat-card class="metric-card aircraft-card">
              <mat-card-content>
                <mat-icon class="metric-icon">airplanemode_active</mat-icon>
                <div><h3>{{ data.totalAircraft }}</h3><p>Total Aircraft</p><small>{{ data.activeAircraft }} active</small></div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="metric-card maintenance-card">
              <mat-card-content>
                <mat-icon class="metric-icon">build</mat-icon>
                <div><h3>{{ data.inMaintenanceAircraft }}</h3><p>In Maintenance</p><small>{{ data.totalMaintenanceRecords }} records</small></div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="metric-card fault-card">
              <mat-card-content>
                <mat-icon class="metric-icon">warning</mat-icon>
                <div><h3>{{ data.openFaults }}</h3><p>Open Faults</p><small>{{ data.criticalFaults }} critical</small></div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="metric-card users-card">
              <mat-card-content>
                <mat-icon class="metric-icon">people</mat-icon>
                <div><h3>{{ data.totalUsers }}</h3><p>Active Users</p><small>{{ data.slaBreaches }} SLA issues</small></div>
              </mat-card-content>
            </mat-card>
          </mat-grid-tile>
        </mat-grid-list>

        <div class="alerts" *ngIf="data.slaBreaches > 0 || data.criticalParts > 0">
          <mat-card class="alert danger" *ngIf="data.slaBreaches > 0">
            <mat-icon>error</mat-icon>
            <div><h3>SLA Violations</h3><p>{{ data.slaBreaches }} fault(s) exceeded SLA</p></div>
          </mat-card>
          <mat-card class="alert warning" *ngIf="data.criticalParts > 0">
            <mat-icon>bolt</mat-icon>
            <div><h3>Critical Parts</h3><p>{{ data.criticalParts }} part(s) at threshold</p></div>
          </mat-card>
        </div>

        <mat-card class="recent-activities">
          <mat-card-header><mat-card-title>Recent Activities</mat-card-title></mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="recentActivities">
              <ng-container matColumnDef="activity">
                <th mat-header-cell *matHeaderCellDef>Activity</th>
                <td mat-cell *matCellDef="let row">{{ row.activity }}</td>
              </ng-container>
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>User</th>
                <td mat-cell *matCellDef="let row">{{ row.user }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip [color]="getStatusColor(row.status)" selected>{{ row.status }}</mat-chip>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper { padding: 24px; max-width: 1600px; margin: 0 auto; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .dashboard-header h1 { font-size: 32px; font-weight: 500; margin: 0; }
    .subtitle { color: var(--text-secondary); margin: 8px 0 0 0; }
    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
    .dashboard-content { display: flex; flex-direction: column; gap: 24px; }

    .metric-card {
      height: 100%;
      border-radius: 12px;
      transition: all 0.3s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    .metric-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.12);
    }

    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .aircraft-card::before { background: linear-gradient(90deg, #1976D2 0%, #42A5F5 100%); }
    .maintenance-card::before { background: linear-gradient(90deg, #FF9800 0%, #FFB74D 100%); }
    .fault-card::before { background: linear-gradient(90deg, #F44336 0%, #EF5350 100%); }
    .users-card::before { background: linear-gradient(90deg, #4CAF50 0%, #81C784 100%); }

    mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 100%;
      padding: 16px !important;
    }

    .metric-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--primary-blue);
      flex-shrink: 0;
    }

    .metric-card h3 { font-size: 24px; font-weight: 600; margin: 0; }
    .metric-card p { font-size: 14px; color: var(--text-secondary); margin: 4px 0; }
    .metric-card small { font-size: 12px; color: var(--text-muted); }

    .alerts {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px !important;
      border-left: 4px solid;
    }

    .alert.danger { border-left-color: #F44336; background: #FFEBEE; }
    .alert.warning { border-left-color: #FF9800; background: #FFF3E0; }

    .alert mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .alert.danger mat-icon { color: #F44336; }
    .alert.warning mat-icon { color: #FF9800; }

    .alert h3 { margin: 0 0 4px 0; font-size: 14px; }
    .alert p { margin: 0; font-size: 13px; }

    .recent-activities { margin-top: 24px; }
    table { width: 100%; }

    @media (max-width: 1200px) {
      mat-grid-list { cols: 2 !important; }
    }

    @media (max-width: 768px) {
      .dashboard-wrapper { padding: 16px; }
      mat-grid-list { cols: 1 !important; rowHeight: 120px !important; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  data: AdminDashboard | null = null;
  recentActivities: any[] = [];
  cols = ['activity', 'user', 'status'];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.apiService.getAdminDashboard().subscribe({
      next: (response: any) => {
        this.data = response.data;
        this.recentActivities = [
          { activity: 'Aircraft Maintenance Completed', user: 'John Doe', status: 'Success' },
          { activity: 'Fault Report Created', user: 'Jane Smith', status: 'Pending' },
          { activity: 'User Added', user: 'Admin', status: 'Success' }
        ];
      },
      error: (error: any) => console.error('Failed to load dashboard:', error)
    });
  }

  getStatusColor(status: string): string {
    return status === 'Success' ? 'accent' : status === 'Pending' ? 'warn' : 'primary';
  }
}
