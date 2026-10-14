import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-faults',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <h2 class="section-title">My Reported Faults</h2>
        <div>
          <button class="btn btn-primary" routerLink="/tech/fault-form">Report New Fault</button>
          <button class="btn btn-secondary ml-2" (click)="loadMyFaults()">Refresh</button>
        </div>
      </div>

      <div class="glass-card mt-3">
        <table class="table w-100">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Aircraft Tail</th>
              <th>Priority Level</th>
              <th>Resolution Status</th>
              <th>Logged Date</th>
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
              <td class="text-secondary">{{ f.openDate | date:'medium' }}</td>
            </tr>
            <tr *ngIf="faults.length === 0">
              <td colspan="5" class="text-center py-4 text-muted">No maintenance discrepancies logged by your account.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .ml-2 { margin-left: 0.5rem; }
    .mono-id { font-family: var(--font-mono, monospace); font-weight: 700; color: #64748b; font-size: 0.8125rem; }
    .tail-pill { font-weight: 700; color: #0284c7; }
    .status-indicator { font-weight: 600; color: #f59e0b; }
    .status-indicator.resolved { color: #16a34a; }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  `]
})
export class MyFaultsComponent implements OnInit {
  faults: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadMyFaults();
  }

  loadMyFaults() {
    this.api.getMyFaults().subscribe(res => {
      if (res.success) this.faults = res.data;
    });
  }
}
