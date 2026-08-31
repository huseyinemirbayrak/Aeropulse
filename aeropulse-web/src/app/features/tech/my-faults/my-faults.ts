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
              <th>ID</th>
              <th>Tail No</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
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
              <td>{{ f.openDate | date:'medium' }}</td>
            </tr>
            <tr *ngIf="faults.length === 0">
              <td colspan="5" class="text-center">You haven't reported any faults yet.</td>
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
