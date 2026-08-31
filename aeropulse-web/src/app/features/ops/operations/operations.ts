import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <h2 class="section-title">Turnaround Operations</h2>
        <button class="btn btn-primary" (click)="loadOps()">Refresh</button>
      </div>

      <div class="glass-card mt-3">
        <table class="table w-100">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Tail No</th>
              <th>Gate</th>
              <th>Status</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let op of operations">
              <td><strong>{{ op.flightNumber }}</strong></td>
              <td>{{ op.aircraftTailNumber }}</td>
              <td>{{ op.gateNo }}</td>
              <td>
                <span class="badge" 
                  [class.badge-info]="op.status === 'Scheduled'"
                  [class.badge-warning]="op.status === 'InProgress' || op.status === 'Delayed'"
                  [class.badge-success]="op.status === 'Completed'">
                  {{ op.status }}
                </span>
                <span *ngIf="op.delayMinutes > 0" class="badge badge-danger ml-2">+{{op.delayMinutes}}m</span>
              </td>
              <td>{{ op.arrivalTime | date:'shortTime' }}</td>
              <td>{{ op.departureTime | date:'shortTime' }}</td>
              <td>
                <button class="btn btn-sm btn-secondary" [routerLink]="['/ops/checklist', op.id]">Checklist</button>
              </td>
            </tr>
            <tr *ngIf="operations.length === 0">
              <td colspan="7" class="text-center">No operations found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .ml-2 { margin-left: 0.5rem; }
  `]
})
export class OperationsComponent implements OnInit {
  operations: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadOps();
  }

  loadOps() {
    this.api.getOperations(1, 50).subscribe(res => {
      if (res.success) this.operations = res.data.items;
    });
  }
}
