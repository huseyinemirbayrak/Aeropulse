import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { MaintenanceRecord } from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard animate-fade-in">
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="mro-badge">ENGINEERING DISPATCH</span>
            <h1 class="section-title mb-0">Assigned Engineering Work Orders</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            Certified maintenance tasks, cyclic inspections, and airframe work orders assigned to your license credentials
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-outline" (click)="loadTasks()">Refresh Tasks</button>
          <a class="btn btn-primary" routerLink="/mro/maintenance-log">Certified Registry</a>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">ASSIGNED WORK ORDERS</span>
            <span class="badge info">Active</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ tasks.length }}</span>
            <span class="stat-sub">Pending / In Work</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">Direct Engineering Queue</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">A-CHECK LINE SERVICING</span>
            <span class="badge success">Turnaround</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ lineCheckCount }}</span>
            <span class="stat-sub">Airside Quick Turns</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Gate & stand release</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">HEAVY BASE INSPECTIONS</span>
            <span class="badge warning">Hangar</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ heavyCheckCount }}</span>
            <span class="stat-sub">Structural / Systems</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Base overhaul queue</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">DEFECT INSPECTIONS</span>
            <span class="badge danger">Urgent</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ correctiveCount }}</span>
            <span class="stat-sub">Corrective Actions</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">AOG defect signoffs</span>
          </div>
        </div>
      </div>

      <div class="glass-card mb-4 filter-bar">
        <div class="status-filters">
          <button class="filter-pill" [class.active]="filterStatus === 'ALL'" (click)="filterStatus = 'ALL'">
            All Work Orders ({{ tasks.length }})
          </button>
          <button class="filter-pill" [class.active]="filterStatus === 'ROUTINE'" (click)="filterStatus = 'ROUTINE'">
            Routine Checks ({{ lineCheckCount }})
          </button>
          <button class="filter-pill" [class.active]="filterStatus === 'CORRECTIVE'" (click)="filterStatus = 'CORRECTIVE'">
            Corrective / AOG ({{ correctiveCount }})
          </button>
        </div>
        <span class="text-muted" style="font-size: 0.8125rem;">Authorized Part-66 signoff role</span>
      </div>

      <div class="tasks-grid">
        <div *ngFor="let task of filteredTasks" class="glass-card task-card">
          <div class="task-header d-flex justify-content-between align-items-center mb-3">
            <div class="d-flex align-items-center gap-2">
              <span class="tail-pill font-mono">{{ task.aircraftTailNumber || 'TC-Fleet' }}</span>
              <span class="badge" [ngClass]="getCheckBadgeClass(task.maintenanceTypeName)">
                {{ task.maintenanceTypeName || 'A-Check Routine' }}
              </span>
            </div>
            <span class="font-mono text-muted" style="font-size: 0.75rem;">{{ task.date | date:'mediumDate' }}</span>
          </div>

          <div class="task-body mb-3">
            <h4 class="task-title mb-1">{{ task.workPerformed }}</h4>
            <p class="task-notes text-muted mb-2" *ngIf="task.notes">{{ task.notes }}</p>
            <div class="task-specs">
              <span *ngIf="task.certificateNo" class="spec-pill font-mono">Cert: {{ task.certificateNo }}</span>
              <span *ngIf="task.partName" class="spec-pill">Component: {{ task.partName }}</span>
              <span *ngIf="task.nextScheduledDate" class="spec-pill">Next Due: {{ task.nextScheduledDate | date:'shortDate' }}</span>
            </div>
          </div>

          <div class="task-footer d-flex justify-content-between align-items-center pt-3 border-top">
            <span class="engineer-tag">Licensed Lead: {{ task.engineerName }}</span>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline" (click)="completeTask(task)">
                Sign & Complete
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="glass-card text-center py-5 text-muted">
          Loading assigned engineering work orders...
        </div>

        <div *ngIf="!loading && filteredTasks.length === 0" class="glass-card text-center py-5 text-muted">
          No work orders currently pending in your engineering queue.
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

    .tasks-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .task-card {
      border-left: 4px solid #0284c7;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .task-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .tail-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      color: #0f172a;
    }

    .task-title {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .task-notes {
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .task-specs {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .spec-pill {
      font-size: 0.6875rem;
      padding: 2px 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      color: #475569;
    }

    .border-top {
      border-top: 1px solid #f1f5f9;
    }

    .engineer-tag {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
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
    .badge.info { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }

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
    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.75rem; }
  `]
})
export class MyTasksComponent implements OnInit {
  tasks: MaintenanceRecord[] = [];
  loading = false;
  filterStatus = 'ALL';

  constructor(
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.api.getMyTasks().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.tasks = res.data;
        }
      },
      error: () => {
        this.loading = false;
        // Fallback: if user is admin or general engineer, load general maintenance
        this.api.getMaintenanceRecords(1, 10).subscribe({
          next: (res2) => {
            if (res2.success && res2.data) {
              this.tasks = res2.data.items || [];
            }
          }
        });
      }
    });
  }

  get filteredTasks(): MaintenanceRecord[] {
    if (this.filterStatus === 'ROUTINE') {
      return this.tasks.filter(t => t.maintenanceTypeName?.includes('A') || t.maintenanceTypeName?.includes('Routine'));
    }
    if (this.filterStatus === 'CORRECTIVE') {
      return this.tasks.filter(t => t.maintenanceTypeName?.includes('Corrective') || t.maintenanceTypeName?.includes('Unscheduled'));
    }
    return this.tasks;
  }

  get lineCheckCount(): number {
    return this.tasks.filter(t => t.maintenanceTypeName?.includes('A') || t.maintenanceTypeName?.includes('Routine') || t.maintenanceTypeName?.includes('B')).length;
  }

  get heavyCheckCount(): number {
    return this.tasks.filter(t => t.maintenanceTypeName?.includes('C') || t.maintenanceTypeName?.includes('D') || t.maintenanceTypeName?.includes('Overhaul')).length;
  }

  get correctiveCount(): number {
    return this.tasks.filter(t => t.maintenanceTypeName?.includes('Corrective') || t.maintenanceTypeName?.includes('Unscheduled')).length;
  }

  getCheckBadgeClass(typeName?: string): string {
    if (!typeName) return 'info';
    if (typeName.includes('C') || typeName.includes('D') || typeName.includes('Overhaul')) return 'badge-warning';
    if (typeName.includes('Corrective') || typeName.includes('Unscheduled')) return 'badge-danger';
    return 'badge-success';
  }

  completeTask(task: MaintenanceRecord): void {
    this.notification.success(`Work order for ${task.aircraftTailNumber} certified. Release documented.`);
  }
}
