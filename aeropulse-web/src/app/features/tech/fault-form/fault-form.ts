import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-fault-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <div>
          <h2 class="section-title">Report New Fault</h2>
          <p class="text-muted">Create a technical defect or maintenance request for aircraft</p>
        </div>
        <button class="btn btn-secondary" routerLink="/tech/my-faults">Cancel</button>
      </div>

      <div class="glass-card mt-3" style="max-width: 650px;">
        <div *ngIf="errorMessage" class="error-banner mb-3">
          ⚠️ {{ errorMessage }}
        </div>

        <form (ngSubmit)="submitFault()">
          <div class="form-group mb-3">
            <label>Aircraft <span style="color: #ef4444;">*</span></label>
            <select class="form-control" [(ngModel)]="model.aircraftId" name="aircraftId" required>
              <option value="" disabled>-- Select Aircraft --</option>
              <option *ngFor="let a of aircrafts" [value]="a.id">
                {{ a.tailNumber }} ({{ a.model }} - {{ a.operator || 'AeroPulse' }})
              </option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label>Priority <span style="color: #ef4444;">*</span></label>
            <select class="form-control" [(ngModel)]="model.priority" name="priority" required>
              <option value="Low">Low - Cosmetic / Routine</option>
              <option value="Medium">Medium - Standard Maintenance</option>
              <option value="High">High - Urgent Action Needed</option>
              <option value="Critical">Critical - Aircraft On Ground (AOG)</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label>Description <span style="color: #ef4444;">*</span></label>
            <textarea class="form-control" [(ngModel)]="model.description" name="description" rows="4" required placeholder="Describe the fault symptoms, affected system, location..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary w-100" [disabled]="submitting || !model.aircraftId || !model.priority || !model.description">
            <span *ngIf="!submitting">Submit Fault Report</span>
            <span *ngIf="submitting">Submitting Report...</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-primary); font-weight: 500; font-size: 0.9rem; }
    .form-control { width: 100%; padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: var(--text-primary); border-radius: 6px; font-size: 0.95rem; }
    .form-control:focus { outline: none; border-color: var(--accent-primary, #38bdf8); }
    .mb-3 { margin-bottom: 1rem; }
    .w-100 { width: 100%; }
    .text-muted { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
    .error-banner { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 6px; padding: 0.75rem 1rem; color: #fca5a5; font-size: 0.9rem; }
  `]
})
export class FaultFormComponent implements OnInit {
  aircrafts: any[] = [];
  submitting = false;
  errorMessage = '';
  model = {
    aircraftId: '',
    priority: 'Medium',
    description: ''
  };

  constructor(
    private api: ApiService, 
    private router: Router,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.api.getAircraft(1, 100).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.aircrafts = res.data.items || [];
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load aircraft list. ' + (err.error?.message || '');
      }
    });
  }

  submitFault() {
    if (!this.model.aircraftId || !this.model.description) {
      this.errorMessage = 'Please select an aircraft and provide a description.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.api.createFaultReport(this.model).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.notification.success('✅ Fault reported successfully!');
          this.router.navigate(['/tech/my-faults']);
        } else {
          this.errorMessage = res.message || 'Failed to submit report.';
          this.notification.error(this.errorMessage);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Server error while submitting fault report.';
        this.notification.error(this.errorMessage);
      }
    });
  }
}
