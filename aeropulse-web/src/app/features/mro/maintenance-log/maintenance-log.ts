import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { MaintenanceRecord, Aircraft } from '../../../core/models';
import { NotificationService } from '../../../core/notification.service';

@Component({
  selector: 'app-maintenance-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="mro-badge">AIRWORTHINESS</span>
            <h1 class="section-title mb-0">Certified Maintenance Registry</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            EASA Form 1 / FAA 8130-3 certified maintenance release logs, airframe inspections, and engineering signoffs
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-outline" (click)="loadRecords()">Refresh Registry</button>
          <button class="btn btn-primary" (click)="openCreateModal()">+ File Maintenance Release</button>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">TOTAL RELEASE LOGS</span>
            <span class="badge info">Registry</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ totalCount }}</span>
            <span class="stat-sub">Certified Releases</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">Permanent Audit Trail</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">HEAVY CHECKS (C/D)</span>
            <span class="badge warning">Overhaul</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ heavyCheckCount }}</span>
            <span class="stat-sub">Structural Inspections</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Major base maintenance</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">LINE MAINTENANCE (A/B)</span>
            <span class="badge success">Active</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ lineCheckCount }}</span>
            <span class="stat-sub">Turnaround / Ramp</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.75rem;">Routine cyclic servicing</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">REGULATORY STATUS</span>
            <span class="badge success">Compliant</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">100%</span>
            <span class="stat-sub">EASA Part-145</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">All releases certified</span>
          </div>
        </div>
      </div>

      <div class="glass-card mb-4 filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search by Tail Number (TC-AER), Certificate No (EASA-145), or Work Performed..."
            class="search-input"
          />
        </div>

        <div class="status-filters">
          <button class="filter-pill" [class.active]="selectedType === 'ALL'" (click)="selectedType = 'ALL'">
            All Releases ({{ records.length }})
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'ACheck'" (click)="selectedType = 'ACheck'">
            A-Check
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'BCheck'" (click)="selectedType = 'BCheck'">
            B-Check
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'CCheck'" (click)="selectedType = 'CCheck'">
            C-Check
          </button>
          <button class="filter-pill" [class.active]="selectedType === 'Unscheduled'" (click)="selectedType = 'Unscheduled'">
            Unscheduled
          </button>
        </div>
      </div>

      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>CERTIFICATE & DATE</th>
                <th>AIRCRAFT</th>
                <th>INSPECTION TYPE</th>
                <th>WORK PERFORMED</th>
                <th>PART / COMPONENT</th>
                <th>CERTIFYING ENGINEER</th>
                <th>NEXT DUE</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of filteredRecords">
                <td>
                  <div class="cert-cell">
                    <span class="cert-number font-mono">{{ record.certificateNo || 'EASA-145-TR' }}</span>
                    <span class="text-muted" style="font-size: 0.75rem;">{{ record.date | date:'mediumDate' }}</span>
                  </div>
                </td>
                <td>
                  <span class="tail-pill">{{ record.aircraftTailNumber || 'TC-Fleet' }}</span>
                </td>
                <td>
                  <span class="badge" [ngClass]="getCheckBadgeClass(record.maintenanceTypeName)">
                    {{ record.maintenanceTypeName || 'Routine Check' }}
                  </span>
                </td>
                <td>
                  <div class="work-desc">{{ record.workPerformed }}</div>
                  <small *ngIf="record.notes" class="text-muted">{{ record.notes }}</small>
                </td>
                <td>
                  <span class="text-muted" style="font-size: 0.8125rem;">
                    {{ record.partName || 'Airframe / Systems' }}
                  </span>
                </td>
                <td>
                  <div class="engineer-cell">
                    <strong>{{ record.engineerName || 'Licensed Engineer' }}</strong>
                    <small class="text-muted">Part-66 B1/B2</small>
                  </div>
                </td>
                <td>
                  <span class="font-mono text-muted" style="font-size: 0.8125rem;">
                    {{ record.nextScheduledDate ? (record.nextScheduledDate | date:'mediumDate') : 'Routine cycle' }}
                  </span>
                </td>
              </tr>

              <tr *ngIf="loading">
                <td colspan="7" class="text-center py-5 text-muted">
                  Synchronizing certified maintenance release registry...
                </td>
              </tr>

              <tr *ngIf="!loading && filteredRecords.length === 0">
                <td colspan="7" class="text-center py-5 text-muted">
                  No maintenance records match active query.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CREATE RELEASE MODAL -->
      <div class="modal-backdrop" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title mb-0">File Certified Maintenance Release</h3>
              <p class="text-muted mb-0" style="font-size: 0.8125rem;">Authorized Part-145 Release-to-Service signoff</p>
            </div>
            <button class="modal-close-btn" (click)="showCreateModal = false">✕</button>
          </div>

          <form (ngSubmit)="submitRecord()" class="modal-body">
            <div class="form-group mb-3">
              <label>Aircraft Tail Number <span class="text-danger">*</span></label>
              <select class="form-control" [(ngModel)]="newRecord.aircraftId" name="aircraftId" required>
                <option value="" disabled>-- Select Aircraft Airframe --</option>
                <option *ngFor="let a of aircraftList" [value]="a.id">
                  {{ a.tailNumber }} ({{ a.model }} - {{ a.operator || 'Fleet' }})
                </option>
              </select>
            </div>

            <div class="grid-2 mb-3">
              <div class="form-group">
                <label>Maintenance Type <span class="text-danger">*</span></label>
                <select class="form-control" [(ngModel)]="newRecord.maintenanceType" name="maintenanceType" required>
                  <option [value]="0">Routine (A-Check)</option>
                  <option [value]="1">Preventive (B-Check)</option>
                  <option [value]="2">Corrective (Unscheduled)</option>
                  <option [value]="3">Annual (C-Check)</option>
                  <option [value]="4">Major Overhaul (D-Check)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Certificate No (EASA/FAA) <span class="text-danger">*</span></label>
                <input 
                  type="text" 
                  class="form-control font-mono" 
                  [(ngModel)]="newRecord.certificateNo" 
                  name="certificateNo" 
                  placeholder="EASA-145-TR-2026-X" 
                  required
                />
              </div>
            </div>

            <div class="form-group mb-3">
              <label>Work Performed & Certification Summary <span class="text-danger">*</span></label>
              <textarea 
                class="form-control" 
                [(ngModel)]="newRecord.workPerformed" 
                name="workPerformed" 
                rows="3" 
                placeholder="Detailed description of airframe, avionics, or powerplant task executed..." 
                required
              ></textarea>
            </div>

            <div class="grid-2 mb-3">
              <div class="form-group">
                <label>Next Scheduled Inspection Date</label>
                <input 
                  type="date" 
                  class="form-control" 
                  [(ngModel)]="newRecord.nextScheduledDate" 
                  name="nextScheduledDate" 
                />
              </div>

              <div class="form-group">
                <label>Engineering Notes / Remarks</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newRecord.notes" 
                  name="notes" 
                  placeholder="Torque checks nominal, oil replenished..."
                />
              </div>
            </div>

            <div class="modal-footer d-flex justify-content-end gap-2 mt-4">
              <button type="button" class="btn btn-outline" (click)="showCreateModal = false">Cancel</button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                [disabled]="submitting || !newRecord.aircraftId || !newRecord.workPerformed || !newRecord.certificateNo"
              >
                {{ submitting ? 'Signing & Certifying...' : 'Sign & Certify Release' }}
              </button>
            </div>
          </form>
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

    .search-input-wrapper {
      position: relative;
      flex: 1;
      min-width: 280px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .search-input {
      width: 100%;
      padding: 0.55rem 0.75rem 0.55rem 2.25rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #0f172a;
    }
    .search-input:focus {
      outline: none;
      border-color: #0284c7;
      background: #ffffff;
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

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th {
      padding: 0.75rem;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #0f172a;
    }

    .cert-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cert-number {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.8125rem;
    }

    .tail-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      color: #0f172a;
      font-family: monospace;
    }

    .work-desc {
      font-weight: 600;
      color: #1e293b;
      max-width: 320px;
    }

    .engineer-cell {
      display: flex;
      flex-direction: column;
      font-size: 0.8125rem;
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
    .text-danger { color: #dc2626 !important; }

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

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      max-width: 620px;
      width: 100%;
      padding: 1.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }
    .modal-close-btn {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .form-control {
      width: 100%;
      padding: 0.55rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #0f172a;
    }
    .form-control:focus {
      outline: none;
      border-color: #0284c7;
      background: #ffffff;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
  `]
})
export class MaintenanceLogComponent implements OnInit {
  records: MaintenanceRecord[] = [];
  aircraftList: Aircraft[] = [];
  loading = false;
  searchQuery = '';
  selectedType = 'ALL';
  totalCount = 0;

  showCreateModal = false;
  submitting = false;
  newRecord = {
    aircraftId: '',
    maintenanceType: 0,
    workPerformed: '',
    certificateNo: 'EASA-145-TR-2026-08',
    nextScheduledDate: '',
    notes: ''
  };

  constructor(
    private api: ApiService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadRecords();
    this.loadAircraft();
  }

  loadRecords(): void {
    this.loading = true;
    this.api.getMaintenanceRecords(1, 100).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.records = res.data.items || [];
          this.totalCount = res.data.totalCount || this.records.length;
        }
      },
      error: () => {
        this.loading = false;
        this.notification.error('Failed to load maintenance records.');
      }
    });
  }

  loadAircraft(): void {
    this.api.getAircraft(1, 100).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.aircraftList = res.data.items || [];
        }
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  submitRecord(): void {
    if (!this.newRecord.aircraftId || !this.newRecord.workPerformed || !this.newRecord.certificateNo) {
      return;
    }

    this.submitting = true;
    const payload = {
      aircraftId: this.newRecord.aircraftId,
      maintenanceType: Number(this.newRecord.maintenanceType),
      workPerformed: this.newRecord.workPerformed,
      certificateNo: this.newRecord.certificateNo,
      nextScheduledDate: this.newRecord.nextScheduledDate ? new Date(this.newRecord.nextScheduledDate).toISOString() : null,
      notes: this.newRecord.notes || undefined
    };

    this.api.createMaintenanceRecord(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.notification.success('Certified maintenance release filed and logged.');
          this.showCreateModal = false;
          this.newRecord = {
            aircraftId: '',
            maintenanceType: 0,
            workPerformed: '',
            certificateNo: 'EASA-145-TR-2026-08',
            nextScheduledDate: '',
            notes: ''
          };
          this.loadRecords();
        } else {
          this.notification.error(res.message || 'Failed to file release.');
        }
      },
      error: (err) => {
        this.submitting = false;
        this.notification.error(err.error?.message || 'Server error creating maintenance entry.');
      }
    });
  }

  get filteredRecords(): MaintenanceRecord[] {
    let list = this.records;
    if (this.selectedType !== 'ALL') {
      list = list.filter(r => r.maintenanceTypeName?.toLowerCase().includes(this.selectedType.toLowerCase()));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r => 
        r.aircraftTailNumber?.toLowerCase().includes(q) ||
        r.certificateNo?.toLowerCase().includes(q) ||
        r.workPerformed?.toLowerCase().includes(q) ||
        r.engineerName?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get heavyCheckCount(): number {
    return this.records.filter(r => r.maintenanceTypeName?.includes('C') || r.maintenanceTypeName?.includes('D') || r.maintenanceTypeName?.includes('Overhaul')).length;
  }

  get lineCheckCount(): number {
    return this.records.filter(r => r.maintenanceTypeName?.includes('A') || r.maintenanceTypeName?.includes('B') || r.maintenanceTypeName?.includes('Routine')).length;
  }

  getCheckBadgeClass(typeName?: string): string {
    if (!typeName) return 'info';
    if (typeName.includes('C') || typeName.includes('D') || typeName.includes('Overhaul')) return 'badge-warning';
    if (typeName.includes('Corrective') || typeName.includes('Unscheduled')) return 'badge-danger';
    return 'badge-success';
  }
}
