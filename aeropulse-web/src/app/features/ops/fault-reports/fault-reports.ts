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
              <th>Tail No</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Reported By</th>
              <th>Elapsed</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of faults">
              <td>{{ f.id.substring(0,8) }}</td>
              <td><strong>{{ f.aircraftTailNumber }}</strong></td>
              <td>
                <span class="badge" 
                  [class.badge-danger]="f.priority === 'Critical'"
                  [class.badge-warning]="f.priority === 'High'"
                  [class.badge-info]="f.priority === 'Medium' || f.priority === 'Low'">
                  {{ f.priority }}
                </span>
              </td>
              <td>{{ f.status }}</td>
              <td>{{ f.reportedByTechnicianName }}</td>
              <td>
                <span [class.text-danger]="f.isSLABreached">{{ f.elapsedMinutes }} min</span>
                <span *ngIf="f.isSLABreached" class="ml-1" title="SLA Breached">⚠️</span>
              </td>
            </tr>
            <tr *ngIf="faults.length === 0">
              <td colspan="6" class="text-center">No faults found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
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
