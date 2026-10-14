import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';

@Component({
  selector: 'app-fault-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <h2 class="section-title">Fault Reports Overview</h2>
        <button class="btn btn-primary" (click)="loadFaults()">Refresh</button>
      </div>

      <div class="glass-card mt-3">
        <table class="table w-100">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tail Number</th>
              <th>Priority Level</th>
              <th>Current Status</th>
              <th>Assigned Technician</th>
              <th>Elapsed Response Time</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of faults">
              <td><span class="mono-id">{{ f.id.substring(0,8).toUpperCase() }}</span></td>
              <td><span class="tail-pill">{{ f.aircraftTailNumber }}</span></td>
              <td>
                <span class="badge" 
                  [class.badge-danger]="f.priority === 'Critical'"
                  [class.badge-warning]="f.priority === 'High'"
                  [class.badge-info]="f.priority === 'Medium' || f.priority === 'Low'">
                  {{ f.priority }}
                </span>
              </td>
              <td>
                <span class="status-indicator" [class.resolved]="f.status === 'Resolved' || f.status === 'Closed'">
                  {{ f.status }}
                </span>
              </td>
              <td>{{ f.reportedByTechnicianName || 'OCC Dispatch' }}</td>
              <td>
                <span [class.text-danger]="f.isSLABreached" class="font-weight-bold">{{ f.elapsedMinutes }} min</span>
                <span *ngIf="f.isSLABreached" class="badge badge-danger ml-2">SLA BREACH</span>
              </td>
            </tr>
            <tr *ngIf="faults.length === 0">
              <td colspan="6" class="text-center py-4 text-muted">No active discrepancies or maintenance faults recorded.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .mono-id { font-family: var(--font-mono, monospace); font-weight: 700; color: #64748b; font-size: 0.8125rem; }
    .tail-pill { font-weight: 700; color: #0284c7; }
    .status-indicator { font-weight: 600; color: #f59e0b; }
    .status-indicator.resolved { color: #16a34a; }
    .ml-2 { margin-left: 0.5rem; }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  `]
})
export class FaultReportsComponent implements OnInit {
  faults: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadFaults();
  }

  loadFaults() {
    this.api.getFaultReports(1, 50).subscribe(res => {
      if (res.success) this.faults = res.data.items;
    });
  }
}
