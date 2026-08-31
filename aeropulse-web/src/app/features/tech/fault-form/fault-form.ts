import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-fault-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <h2 class="section-title">Report New Fault</h2>
        <button class="btn btn-secondary" routerLink="/tech/my-faults">Cancel</button>
      </div>

      <div class="glass-card mt-3" style="max-width: 600px;">
        <form (ngSubmit)="submitFault()">
          <div class="form-group mb-3">
            <label>Aircraft</label>
            <select class="form-control" [(ngModel)]="model.aircraftId" name="aircraftId" required>
              <option value="" disabled>Select Aircraft</option>
              <option *ngFor="let a of aircrafts" [value]="a.id">{{ a.tailNumber }}</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label>Priority</label>
            <select class="form-control" [(ngModel)]="model.priority" name="priority" required>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label>Description</label>
            <textarea class="form-control" [(ngModel)]="model.description" name="description" rows="4" required placeholder="Describe the fault in detail..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary w-100" [disabled]="!model.aircraftId || !model.priority || !model.description">Submit Report</button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-primary); }
    .form-control { width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); border-radius: 4px; }
    .mb-3 { margin-bottom: 1rem; }
    .w-100 { width: 100%; }
  `]
})
export class FaultFormComponent implements OnInit {
  aircrafts: any[] = [];
  model = {
    aircraftId: '',
    priority: 'Medium',
    description: ''
  };

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getAircraft(1, 100).subscribe(res => {
      if (res.success) this.aircrafts = res.data.items;
    });
  }

  submitFault() {
    this.api.createFaultReport(this.model).subscribe(res => {
      if (res.success) {
        alert('Fault reported successfully!');
        this.router.navigate(['/tech/my-faults']);
      } else {
        alert('Error: ' + res.message);
      }
    });
  }
}
