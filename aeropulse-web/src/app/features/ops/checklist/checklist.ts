import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard" *ngIf="checklist">
      <div class="header-actions">
        <h2 class="section-title">Checklist: {{ checklist.flightNumber }} ({{ checklist.aircraftTailNumber }})</h2>
        <button class="btn btn-secondary" routerLink="/ops/operations">Back</button>
      </div>

      <div class="glass-card mt-3">
        <h3 class="mb-3">Status: <span class="text-info">{{ checklist.status }}</span></h3>
        
        <div class="list-container">
          <div *ngFor="let item of checklist.items" class="list-item" [class.completed]="item.isCompleted">
            <div class="item-header">
              <span>{{ item.step }}</span>
              <span *ngIf="item.isCompleted" class="badge badge-success">✓ Done</span>
              <span *ngIf="!item.isCompleted" class="badge badge-warning">Pending</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-4" *ngIf="checklist.status !== 'Completed' && checklist.status !== 'Cancelled'">
        <div class="glass-card">
          <h3 class="section-title">Close Operation (SLA Transaction)</h3>
          <p class="text-muted mb-3">Ensure all physical steps are completed before closing. This will write an SLA record.</p>
          <button class="btn btn-primary" (click)="closeOperation()">Close Operation</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .list-container { display: flex; flex-direction: column; gap: 0.5rem; }
    .list-item { padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; }
    .list-item.completed { border-left: 4px solid var(--color-success); }
    .item-header { display: flex; justify-content: space-between; align-items: center; font-weight: 500; }
  `]
})
export class ChecklistComponent implements OnInit {
  checklist: any = null;
  operationId: string = '';

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.operationId = params.get('id') || '';
      if (this.operationId) {
        this.loadChecklist();
      }
    });
  }

  loadChecklist() {
    this.api.getOperationChecklist(this.operationId).subscribe(res => {
      if (res.success) this.checklist = res.data;
    });
  }
  
  closeOperation() {
    if (confirm('Are you sure you want to close this operation?')) {
      this.api.closeOperationWithSLA(this.operationId, { delayMinutes: 0, completionNotes: 'Closed via web' }).subscribe(res => {
        if (res.success) {
          alert('Operation closed successfully!');
          this.loadChecklist();
        } else {
          alert('Failed to close operation: ' + res.message);
        }
      });
    }
  }
}
