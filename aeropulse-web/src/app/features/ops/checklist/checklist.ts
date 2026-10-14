import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';
import { SignalRService } from '../../../core/signalr.service';

interface MissingPassenger {
  id: string;
  name: string;
  seat: string;
  bagTag: string;
  bagStatus: 'LOADED' | 'OFFLOADED' | 'NO_BAG';
  announced: boolean;
}

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in" *ngIf="loading && !operation">
      <div class="glass-card text-center py-5">
        <p class="text-muted">Loading turnaround and flight telemetry...</p>
      </div>
    </div>

    <div class="dashboard animate-fade-in" *ngIf="operation">
      <div class="header-actions mb-3">
        <div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="flight-badge">{{ operation.flightNumber }}</span>
            <h1 class="section-title mb-0">{{ operation.tailNumber }} • {{ operation.aircraftModel || 'Airbus A320neo' }}</h1>
            <span class="status-badge" [ngClass]="operation.status === 'Completed' ? 'success' : 'warning'">
              {{ operation.status }}
            </span>
          </div>
          <p class="text-muted mt-1 mb-0">
            Gate: <strong>{{ operation.gateNo || 'A1' }}</strong> • 
            Runway: <strong>{{ operation.assignedRunwayCode || '35R' }}</strong> • 
            Target Departure: <strong>{{ operation.departureTime | date:'shortTime' }}</strong> •
            Routing: <strong>IST ➔ Frankfurt (FRA)</strong>
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-secondary" routerLink="/ops/operations">◀ Flight Schedule</button>
          <button class="btn btn-secondary" routerLink="/ops/gse-fleet">GSE Fleet</button>
          <button class="btn btn-secondary" routerLink="/ops/ramp">Ramp Dispatch</button>
          <button class="btn btn-secondary" routerLink="/ops/dashboard">Radar View</button>
          <button class="btn btn-refresh" (click)="loadTurnaroundData()">Refresh</button>
        </div>
      </div>

      <div class="glass-card banner-card mb-4">
        <div class="banner-grid">
          <div class="banner-col">
            <span class="banner-label">TURNAROUND COUNTDOWN</span>
            <div class="countdown-value">{{ countdownText }}</div>
            <span class="banner-sub">Time remaining until scheduled pushback</span>
          </div>

          <div class="banner-col">
            <span class="banner-label">OVERALL MILESTONE PROGRESS</span>
            <div class="d-flex align-items-center gap-2 mt-1">
              <div class="progress-track flex-grow-1">
                <div class="progress-bar-fill" [style.width.%]="overallProgress"></div>
              </div>
              <strong class="progress-text">{{ overallProgress }}%</strong>
            </div>
            <span class="banner-sub">{{ completedTasksCount }} / {{ tasks.length }} Milestones Completed</span>
          </div>

          <div class="banner-col">
            <span class="banner-label">DEPARTURE CLEARANCE AUTHORIZATION</span>
            <div class="d-flex align-items-center gap-2 mt-1">
              <button 
                class="clearance-toggle-btn"
                [class.authorized]="manifest?.loadsheetApproved"
                (click)="toggleClearance()"
                [disabled]="approvalSubmitting"
              >
                <span class="indicator-dot"></span>
                {{ manifest?.loadsheetApproved ? 'CLEARANCE GRANTED' : 'PENDING APPROVAL' }}
              </button>
            </div>
            <span class="banner-sub" *ngIf="manifest?.approvedByRedcap">
              Authorized by: {{ manifest.approvedByRedcap }}
            </span>
            <span class="banner-sub" *ngIf="!manifest?.approvedByRedcap">
              Digital signature required prior to pushback
            </span>
          </div>
        </div>
      </div>

      <div class="tab-nav mb-4">
        <button class="tab-btn" [class.active]="activeTab === 'TASKS'" (click)="activeTab = 'TASKS'">
          Turnaround Milestones & Ramp ({{ tasks.length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'BOARDING'" (click)="activeTab = 'BOARDING'">
          Gate Boarding & BRS Reconciliation
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'LOADSHEET'" (click)="activeTab = 'LOADSHEET'">
          Weight & Balance (e-Loadsheet)
        </button>
      </div>

      <div *ngIf="activeTab === 'TASKS'" class="tab-content">
        <div class="glass-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 class="card-section-title">Critical Turnaround Milestones</h3>
              <p class="text-muted mb-0">Synchronized airside services from block-on to pushback clearance</p>
            </div>
            <button class="btn btn-sm btn-outline" (click)="loadTurnaroundData()">Sync Telemetry</button>
          </div>

          <div class="tasks-list">
            <div *ngFor="let task of tasks" class="task-card" [ngClass]="getTaskCardClass(task.status)">
              <div class="task-left">
                <div class="task-icon-box">
                  <span class="task-icon">{{ getTaskIcon(task.taskType) }}</span>
                </div>
                <div class="task-details">
                  <div class="task-title-row">
                    <h4 class="task-name">{{ getTaskTitle(task.taskType) }}</h4>
                    <span class="badge" [ngClass]="getTaskBadgeClass(task.status)">
                      {{ getTaskStatusText(task.status) }}
                    </span>
                  </div>

                  <div class="task-dynamic-metric mt-1">
                    <span class="metric-text">{{ getDynamicTaskMetric(task) }}</span>
                  </div>

                  <p class="task-notes text-muted mt-1 mb-0" *ngIf="task.notes">{{ task.notes }}</p>

                  <div class="task-meta mt-2">
                    <a *ngIf="task.assignedGSECode" routerLink="/ops/gse-fleet" class="meta-pill gse" style="text-decoration: none; cursor: pointer;">
                      GSE Unit: <strong>{{ task.assignedGSECode }}</strong>
                    </a>
                    <span *ngIf="task.assignedUserName" class="meta-pill user">
                      Lead: <strong>{{ task.assignedUserName }}</strong>
                    </span>
                    <span class="meta-pill time">
                      Target: {{ task.targetDurationMinutes }}m
                    </span>
                  </div>
                </div>
              </div>

              <div class="task-center">
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.75rem;">
                  <span class="text-muted">Completion Level</span>
                  <strong>{{ task.progressPercentage }}%</strong>
                </div>
                <div class="progress-track">
                  <div class="progress-bar-fill" [style.width.%]="task.progressPercentage"></div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  [(ngModel)]="task.progressPercentage" 
                  class="progress-slider mt-2" 
                  (change)="quickUpdateProgress(task)"
                  title="Adjust progress percentage"
                />
              </div>

              <div class="task-actions">
                <button 
                  *ngIf="task.status === 0" 
                  class="btn btn-sm btn-primary" 
                  (click)="updateTaskStatus(task, 2)"
                >
                  Start Task
                </button>
                <button 
                  *ngIf="task.status === 2" 
                  class="btn btn-sm btn-success" 
                  (click)="updateTaskStatus(task, 3)"
                >
                  Complete
                </button>
                <span *ngIf="task.status === 3" class="text-success font-weight-bold" style="font-size: 0.85rem;">
                  Completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="activeTab === 'BOARDING'" class="tab-content">
        <div class="grid grid-2 mb-4">
          <div class="glass-card">
            <h3 class="card-section-title mb-3">Passenger Manifest & Boarding Counters</h3>

            <div class="boarding-stats-grid mb-4">
              <div class="boarding-stat-box">
                <span class="label">TOTAL BOOKED</span>
                <span class="num">{{ manifest?.totalBooked || 180 }}</span>
                <small class="text-muted">Confirmed Pax</small>
              </div>
              <div class="boarding-stat-box highlight">
                <span class="label">BOARDED</span>
                <span class="num text-success">{{ manifest?.boardedCount || 0 }}</span>
                <small class="text-muted">{{ ((manifest?.boardedCount || 0) / (manifest?.totalBooked || 180) * 100) | number:'1.0-0' }}% On Board</small>
              </div>
              <div class="boarding-stat-box">
                <span class="label">UNBOARDED</span>
                <span class="num text-warning">{{ missingPassengerCount }}</span>
                <small class="text-muted">Gate Standby</small>
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <span>Gate Boarding Progress</span>
                <strong>{{ ((manifest?.boardedCount || 0) / (manifest?.totalBooked || 180) * 100) | number:'1.0-0' }}%</strong>
              </div>
              <div class="progress-track" style="height: 12px;">
                <div class="progress-bar-fill" [style.width.%]="(manifest?.boardedCount || 0) / (manifest?.totalBooked || 180) * 100"></div>
              </div>
            </div>

            <div class="d-flex gap-2 flex-wrap mb-2">
              <button class="btn btn-primary" (click)="scanSinglePassenger()" [disabled]="(manifest?.boardedCount || 0) >= (manifest?.totalBooked || 180)">
                Scan Boarding Pass (+1)
              </button>
              <button class="btn btn-outline" (click)="bulkScanPassengers(10)" [disabled]="(manifest?.boardedCount || 0) >= (manifest?.totalBooked || 180)">
                Batch Scan (+10)
              </button>
              <button class="btn btn-secondary" (click)="completeAllBoarding()">
                Close Gate (All Boarded)
              </button>
            </div>
          </div>

          <div class="glass-card">
            <h3 class="card-section-title mb-3">Baggage Reconciliation System (BRS)</h3>
            
            <div class="brs-box mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Checked Baggage Units:</span>
                <strong>{{ manifest?.checkedBaggageCount || 154 }} Bags</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Loaded in Holds:</span>
                <strong class="text-info">{{ manifest?.loadedBaggageCount || 0 }} Bags</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span>Passenger-Bag Match Integrity:</span>
                <span class="badge" [ngClass]="isLuggageCompliant ? 'success' : 'warning'">
                  {{ isLuggageCompliant ? '100% Secure & Reconciled' : 'Discrepancy Detected' }}
                </span>
              </div>
            </div>

            <div class="brs-alert-card mb-3" *ngIf="missingPassengerCount > 0 && hasLoadedMissingBags">
              <div>
                <strong>ICAO Annex 17 / IATA Security Protocol:</strong>
                <p class="mb-0 text-muted" style="font-size: 0.85rem;">
                  There are {{ missingPassengerCount }} unboarded passenger(s). Bags belonging to no-show passengers must be offloaded prior to departure clearance.
                </p>
              </div>
            </div>

            <button class="btn btn-warning w-100 mb-2" (click)="notifyMissingPassengers()">
              Notify OCC & Dispatch of Missing Pax
            </button>
          </div>
        </div>

        <div class="glass-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 class="card-section-title">Unboarded Passengers & BRS Reconciliations</h3>
              <p class="text-muted mb-0">Broadcast gate call or initiate offload protocol for hold luggage</p>
            </div>
            <span class="badge warning">{{ missingPassengers.length }} Passengers Pending</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SEAT</th>
                  <th>PASSENGER NAME</th>
                  <th>BAG TAG</th>
                  <th>BRS HOLD STATUS</th>
                  <th>CALL STATUS</th>
                  <th style="text-align: right;">SECURITY ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of missingPassengers">
                  <td>
                    <span class="seat-badge">{{ p.seat }}</span>
                  </td>
                  <td>
                    <strong>{{ p.name }}</strong>
                    <div class="text-muted" style="font-size: 0.75rem;">Economy Class • Checked-In</div>
                  </td>
                  <td>
                    <code class="bag-tag">{{ p.bagTag }}</code>
                  </td>
                  <td>
                    <span *ngIf="p.bagStatus === 'LOADED'" class="badge danger">
                      Loaded in Hold (Risk)
                    </span>
                    <span *ngIf="p.bagStatus === 'OFFLOADED'" class="badge success">
                      Offloaded Safely
                    </span>
                    <span *ngIf="p.bagStatus === 'NO_BAG'" class="badge info">
                      No Checked Bags
                    </span>
                  </td>
                  <td>
                    <span *ngIf="p.announced" class="badge info">Final Call Made</span>
                    <span *ngIf="!p.announced" class="badge secondary">Standby</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="d-flex justify-content-end gap-2">
                      <button 
                        class="btn btn-sm btn-outline" 
                        (click)="announcePassenger(p)"
                        title="Simulate gate audio call"
                      >
                        Final Call
                      </button>
                      <button 
                        *ngIf="p.bagStatus === 'LOADED'"
                        class="btn btn-sm btn-danger" 
                        (click)="offloadBag(p)"
                        title="Offload bag from hold"
                      >
                        Offload Bag
                      </button>
                      <button 
                        *ngIf="p.bagStatus === 'OFFLOADED'"
                        class="btn btn-sm btn-secondary" 
                        (click)="restoreBag(p)"
                      >
                        Reload Bag
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="missingPassengers.length === 0">
                  <td colspan="6" class="text-center py-4 text-success font-weight-bold">
                    All passengers boarded. Ready to close gate.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div *ngIf="activeTab === 'LOADSHEET'" class="tab-content">
        <div class="glass-card loadsheet-card">
          <div class="loadsheet-header mb-4">
            <div class="d-flex align-items-center gap-3">
              <div class="logo-plane" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(37, 99, 235, 0.1); color: var(--accent-primary); border-radius: 6px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
                </svg>
              </div>
              <div>
                <h3 class="mb-0">AEROPULSE ELECTRONIC WEIGHT & BALANCE SHEET (e-LOADSHEET)</h3>
                <small class="text-muted">IATA AHM 560 Standard Compliance — Certified Aircraft Center of Gravity (CG)</small>
              </div>
            </div>
            <div class="loadsheet-status">
              <span *ngIf="manifest?.loadsheetApproved" class="stamp approved">RELEASED</span>
              <span *ngIf="!manifest?.loadsheetApproved" class="stamp pending">DRAFT</span>
            </div>
          </div>

          <div class="loadsheet-table-wrap mb-4">
            <table class="loadsheet-table">
              <thead>
                <tr>
                  <th>WEIGHT PARAMETER</th>
                  <th>VALUE (KG)</th>
                  <th>STRUCTURAL LIMIT (MAX KG)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Dry Operating Weight (DOW)</td>
                  <td><strong>41,500 kg</strong></td>
                  <td>-</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr>
                  <td>Traffic Load ({{ manifest?.boardedCount || 162 }} pax x 84 kg)</td>
                  <td><strong>{{ (manifest?.boardedCount || 162) * 84 | number }} kg</strong></td>
                  <td>-</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr>
                  <td>Checked Baggage & Cargo Weight</td>
                  <td><strong>{{ (manifest?.loadedBaggageCount || 130) * 18 | number }} kg</strong></td>
                  <td>-</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr class="highlight-row">
                  <td>Zero Fuel Weight (ZFW)</td>
                  <td><strong>{{ 41500 + ((manifest?.boardedCount || 162) * 84) + ((manifest?.loadedBaggageCount || 130) * 18) | number }} kg</strong></td>
                  <td>62,500 kg</td>
                  <td><span class="badge success">WITHIN LIMIT</span></td>
                </tr>
                <tr>
                  <td>Takeoff / Block Fuel</td>
                  <td><strong>8,500 kg</strong></td>
                  <td>26,020 kg</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr class="total-row">
                  <td>Calculated Takeoff Weight (TOW)</td>
                  <td><strong>{{ 41500 + ((manifest?.boardedCount || 162) * 84) + ((manifest?.loadedBaggageCount || 130) * 18) + 8500 | number }} kg</strong></td>
                  <td>79,000 kg</td>
                  <td><span class="badge success">GO</span></td>
                </tr>
                <tr>
                  <td>Center of Gravity (CG)</td>
                  <td><strong>27.4% MAC</strong></td>
                  <td>18% - 33% MAC</td>
                  <td><span class="badge success">BALANCED</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="approval-box">
            <div class="grid grid-2 mb-3">
              <div class="signature-box">
                <span class="sign-role">OPERATIONS DISPATCHER (REDCAP)</span>
                <strong class="sign-name">{{ manifest?.approvedByRedcap || 'Sarah Operations (Lead)' }}</strong>
                <span class="sign-status" [class.signed]="manifest?.loadsheetApproved">
                  {{ manifest?.loadsheetApproved ? 'DIGITALLY SIGNED' : 'PENDING SIGNATURE' }}
                </span>
                <small class="text-muted" *ngIf="manifest?.departureClearanceGivenAt">
                  Timestamp: {{ manifest.departureClearanceGivenAt | date:'medium' }}
                </small>
              </div>

              <div class="signature-box">
                <span class="sign-role">PILOT-IN-COMMAND (PIC)</span>
                <strong class="sign-name">Capt. Edward Vance</strong>
                <span class="sign-status" [class.signed]="manifest?.loadsheetApproved">
                  {{ manifest?.loadsheetApproved ? 'ACCEPTED VIA ACARS' : 'PENDING ACARS TRANSMISSION' }}
                </span>
                <small class="text-muted">Transmitted to Cockpit EFB</small>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <p class="mb-0 text-muted" style="font-size: 0.85rem;">
                  Authorizing this document transmits final departure readiness to ATC Tower and releases aircraft for pushback.
                </p>
              </div>
              <div class="d-flex gap-2">
                <button 
                  *ngIf="!manifest?.loadsheetApproved"
                  class="btn btn-success btn-lg" 
                  (click)="toggleClearance(true)"
                  [disabled]="approvalSubmitting"
                >
                  Sign & Authorize Departure Release
                </button>
                <button 
                  *ngIf="manifest?.loadsheetApproved"
                  class="btn btn-outline-danger" 
                  (click)="toggleClearance(false)"
                  [disabled]="approvalSubmitting"
                >
                  Revoke Clearance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .d-flex { display: flex; }
    .align-items-center { align-items: center; }
    .justify-content-between { justify-content: space-between; }
    .justify-content-end { justify-content: flex-end; }
    .flex-wrap { flex-wrap: wrap; }
    .flex-grow-1 { flex-grow: 1; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .mb-0 { margin-bottom: 0; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .w-100 { width: 100%; }

    .flight-badge {
      padding: 4px 10px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      color: #0284c7;
      font-weight: 700;
      font-size: 0.95rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
    }

    .status-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-badge.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .status-badge.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .banner-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
    }

    .banner-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }

    .banner-col {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .banner-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .countdown-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .banner-sub {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .progress-track {
      background: #f1f5f9;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-fill {
      background: #0284c7;
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .clearance-toggle-btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      color: #b45309;
    }

    .clearance-toggle-btn.authorized {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }

    .indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .tab-nav {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }

    .tab-btn {
      padding: 0.5rem 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      color: #475569;
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .tab-btn.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }

    .card-section-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .task-card {
      display: grid;
      grid-template-columns: 2fr 1fr auto;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .task-card.completed { border-left: 4px solid #16a34a; }
    .task-card.in-progress { border-left: 4px solid #0284c7; }
    .task-card.pending { border-left: 4px solid #cbd5e1; }

    .task-left {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .task-icon-box {
      min-width: 48px;
      height: 32px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #334155;
      font-family: var(--font-mono, monospace);
      flex-shrink: 0;
    }

    .task-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .task-name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
    }

    .task-dynamic-metric {
      font-size: 0.8125rem;
      color: #0284c7;
      font-weight: 600;
    }

    .task-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .meta-pill {
      font-size: 0.6875rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
    }

    .progress-slider {
      width: 100%;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .boarding-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .boarding-stat-box {
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .boarding-stat-box.highlight {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .boarding-stat-box .label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
    }

    .boarding-stat-box .num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }

    .brs-box {
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .brs-alert-card {
      padding: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: #991b1b;
      font-size: 0.8125rem;
    }

    .seat-badge {
      padding: 2px 6px;
      border-radius: 4px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0284c7;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .bag-tag {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }

    .data-table th {
      padding: 0.625rem 0.75rem;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.6875rem;
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

    .loadsheet-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .loadsheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
    }

    .stamp {
      font-size: 0.8125rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .stamp.approved { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
    .stamp.pending { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; }

    .loadsheet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .loadsheet-table th, .loadsheet-table td {
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      text-align: left;
    }

    .loadsheet-table th {
      color: #475569;
      font-weight: 700;
      font-size: 0.6875rem;
      text-transform: uppercase;
      background: #f8fafc;
    }

    .highlight-row { background: #f0f9ff; }
    .total-row { background: #f0fdf4; font-weight: 700; }

    .approval-box {
      border-top: 1px solid #e2e8f0;
      padding-top: 1.5rem;
      margin-top: 1rem;
    }

    .signature-box {
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .sign-role {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .sign-name {
      font-size: 0.95rem;
      color: #0f172a;
    }

    .sign-status {
      font-size: 0.75rem;
      font-weight: 700;
      color: #b45309;
    }
    .sign-status.signed { color: #166534; }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
    }
    .badge.secondary { background: #f1f5f9; color: #475569; }
    .badge.info { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
    .badge.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge.danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

    .btn-lg {
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .btn-outline-danger {
      background: #ffffff;
      border: 1px solid #fca5a5;
      color: #dc2626;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-outline-danger:hover {
      background: #fef2f2;
    }
  `]
})
export class ChecklistComponent implements OnInit, OnDestroy {
  loading = false;
  operationId = '';
  operation: any = null;
  tasks: any[] = [];
  manifest: any = null;
  activeTab: 'TASKS' | 'BOARDING' | 'LOADSHEET' = 'TASKS';

  countdownText = '00:38:15';
  approvalSubmitting = false;

  missingPassengers: MissingPassenger[] = [
    { id: '1', name: 'Thomas Miller', seat: '14B', bagTag: 'TK-849201', bagStatus: 'LOADED', announced: false },
    { id: '2', name: 'Elena Rostova', seat: '22F', bagTag: 'TK-849202', bagStatus: 'LOADED', announced: false },
    { id: '3', name: 'Marcus Vance', seat: '08C', bagTag: 'TK-849203', bagStatus: 'LOADED', announced: false },
  ];

  private pollTimer: any = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private notification: NotificationService,
    private signalr: SignalRService
  ) {}

  ngOnInit() {
    const currentUrl = this.router.url;
    if (currentUrl.includes('gate-agent')) {
      this.activeTab = 'BOARDING';
    } else if (currentUrl.includes('loadsheet')) {
      this.activeTab = 'LOADSHEET';
    } else {
      this.activeTab = 'TASKS';
    }

    this.route.paramMap.subscribe(params => {
      this.operationId = params.get('id') || '';
      if (this.operationId) {
        this.loadTurnaroundData();
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab === 'boarding') this.activeTab = 'BOARDING';
      if (tab === 'loadsheet') this.activeTab = 'LOADSHEET';
      if (tab === 'tasks') this.activeTab = 'TASKS';
    });

    this.subs.push(
      this.signalr.turnaround$.subscribe((ev) => {
        if (ev.operationId === this.operationId || (this.operation && ev.flightNumber === this.operation.flightNumber)) {
          const task = this.tasks.find(t => t.id === ev.taskId);
          if (task) {
            const statusNum = ev.status === 'Completed' ? 3 : ev.status === 'InProgress' ? 2 : ev.status === 'Accepted' ? 1 : 0;
            task.status = statusNum;
            task.progressPercentage = ev.progressPercentage;
            if (ev.notes) task.notes = ev.notes;
            if (ev.assignedGSECode) task.assignedGSECode = ev.assignedGSECode;
          } else {
            this.loadTurnaroundData(true);
          }
        }
      }),

      this.signalr.boarding$.subscribe((ev) => {
        if (this.manifest && (ev.manifestId === this.manifest.id || (this.operation && ev.flightNumber === this.operation.flightNumber))) {
          this.manifest.boardedCount = ev.boardedCount;
          this.manifest.loadedBaggageCount = ev.loadedBaggageCount;
          this.manifest.luggageMatchComplete = ev.luggageMatchComplete;
          this.manifest.loadsheetApproved = ev.loadsheetApproved;
          this.manifest.approvedByRedcap = ev.approvedByRedcap;
        }
      })
    );

    this.pollTimer = setInterval(() => {
      if (this.operationId) this.loadTurnaroundData(true);
    }, 20000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.operation?.flightNumber) {
      this.signalr.leaveFlight(this.operation.flightNumber);
    }
    this.subs.forEach(s => s.unsubscribe());
  }

  loadTurnaroundData(silent = false) {
    if (!silent) this.loading = true;

    this.api.getTurnaroundDetail(this.operationId).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.operation = res.data.operation;
          this.tasks = res.data.tasks || [];
          this.manifest = res.data.manifest;
          this.calculateCountdown();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to load turnaround telemetry:', err);
      }
    });
  }

  get overallProgress(): number {
    if (this.tasks.length === 0) return 0;
    const total = this.tasks.reduce((sum, t) => sum + (t.progressPercentage || 0), 0);
    return Math.round(total / this.tasks.length);
  }

  get completedTasksCount(): number {
    return this.tasks.filter(t => t.status === 3).length;
  }

  get missingPassengerCount(): number {
    const booked = this.manifest?.totalBooked || 180;
    const boarded = this.manifest?.boardedCount || 0;
    return Math.max(0, booked - boarded);
  }

  get hasLoadedMissingBags(): boolean {
    return this.missingPassengers.some(p => p.bagStatus === 'LOADED');
  }

  get isLuggageCompliant(): boolean {
    if (this.manifest?.luggageMatchComplete) return true;
    if (this.missingPassengerCount === 0) return true;
    return this.missingPassengers.every(p => p.bagStatus !== 'LOADED');
  }

  calculateCountdown() {
    if (!this.operation?.departureTime) {
      this.countdownText = '00:45:00';
      return;
    }
    const diffMs = new Date(this.operation.departureTime).getTime() - new Date().getTime();
    if (diffMs <= 0) {
      this.countdownText = '00:00:00 (Departure Window)';
      return;
    }
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    this.countdownText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getDynamicTaskMetric(task: any): string {
    const pct = task.progressPercentage || 0;
    switch (task.taskType) {
      case 1:
        return `${Math.round((pct / 100) * 142)} / 142 Inbound Bags Unloaded`;
      case 2:
        return `${Math.round((pct / 100) * 8500).toLocaleString()} kg / 8,500 kg Jet A-1 Fuel Uploaded`;
      case 3:
        return pct >= 100 ? 'Cabin & Lavatory Servicing Completed' : 'Cabin Grooming In Progress';
      case 4:
        return pct >= 100 ? 'Galley & Meal Uplift Finished' : 'Catering & Bar Units In Progress';
      case 5:
        const totalLuggage = this.manifest?.checkedBaggageCount || 154;
        return `${Math.round((pct / 100) * totalLuggage)} / ${totalLuggage} Outbound Bags Stowed in Holds`;
      case 6:
        const booked = this.manifest?.totalBooked || 180;
        const boarded = this.manifest?.boardedCount || 162;
        return `${boarded} / ${booked} Passengers Boarded`;
      case 7:
        return pct >= 100 ? 'Pushback Finished • Chocks Away' : 'Towbar Connected • Standby for Release';
      default:
        return `${pct}% Complete`;
    }
  }

  getTaskTitle(taskType: number): string {
    switch (taskType) {
      case 0: return 'Passenger Deboarding';
      case 1: return 'Inbound Baggage Unload';
      case 2: return 'Aircraft Refueling';
      case 3: return 'Cabin Cleaning & Grooming';
      case 4: return 'Galley Catering Uplift';
      case 5: return 'Outbound Baggage Loading';
      case 6: return 'Passenger Boarding';
      case 7: return 'Pushback & Engine Start';
      default: return 'Ground Handling Task';
    }
  }

  getTaskIcon(taskType: number): string {
    switch (taskType) {
      case 0: return 'DEPLN';
      case 1: return 'BAG';
      case 2: return 'FUEL';
      case 3: return 'CLN';
      case 4: return 'CATR';
      case 5: return 'CRG';
      case 6: return 'BRD';
      case 7: return 'PUSH';
      default: return 'TASK';
    }
  }

  getTaskStatusText(status: number): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Accepted';
      case 2: return 'In Progress';
      case 3: return 'Completed';
      case 4: return 'Delayed';
      default: return 'Unknown';
    }
  }

  getTaskBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'secondary';
      case 1: return 'info';
      case 2: return 'warning';
      case 3: return 'success';
      case 4: return 'danger';
      default: return 'secondary';
    }
  }

  getTaskCardClass(status: number): string {
    switch (status) {
      case 2: return 'in-progress';
      case 3: return 'completed';
      default: return 'pending';
    }
  }

  updateTaskStatus(task: any, newStatus: number) {
    const progress = newStatus === 3 ? 100 : (newStatus === 2 ? 50 : task.progressPercentage);
    this.api.updateTurnaroundTask(task.id, {
      status: newStatus,
      progressPercentage: progress
    }).subscribe({
      next: (res) => {
        if (res.success) {
          task.status = newStatus;
          task.progressPercentage = progress;
          this.notification.success(`${this.getTaskTitle(task.taskType)} updated.`);
        }
      },
      error: () => this.notification.error('Failed to update task status.')
    });
  }

  quickUpdateProgress(task: any) {
    const newStatus = task.progressPercentage >= 100 ? 3 : (task.progressPercentage > 0 ? 2 : 0);
    this.api.updateTurnaroundTask(task.id, {
      status: newStatus,
      progressPercentage: task.progressPercentage
    }).subscribe({
      next: () => {
        task.status = newStatus;
      }
    });
  }

  scanSinglePassenger() {
    if (!this.manifest) return;
    const nextCount = (this.manifest.boardedCount || 0) + 1;
    this.manifest.boardedCount = nextCount;
    this.api.updateBoarding(this.manifest.id, {
      boardedCount: nextCount
    }).subscribe({
      next: () => this.notification.success(`Passenger Boarded: #${nextCount}`)
    });
  }

  bulkScanPassengers(count: number) {
    if (!this.manifest) return;
    const nextCount = Math.min(this.manifest.totalBooked || 180, (this.manifest.boardedCount || 0) + count);
    this.manifest.boardedCount = nextCount;
    this.api.updateBoarding(this.manifest.id, {
      boardedCount: nextCount
    }).subscribe({
      next: () => this.notification.success(`Batch: ${count} passengers boarded. Total: ${nextCount}`)
    });
  }

  completeAllBoarding() {
    if (!this.manifest) return;
    const total = this.manifest.totalBooked || 180;
    this.manifest.boardedCount = total;
    this.manifest.loadedBaggageCount = this.manifest.checkedBaggageCount || 154;
    this.manifest.boardingStatus = 3;
    this.manifest.luggageMatchComplete = true;

    this.missingPassengers = [];

    this.api.updateBoarding(this.manifest.id, {
      boardedCount: total,
      loadedBaggageCount: this.manifest.loadedBaggageCount,
      boardingStatus: 3,
      luggageMatchComplete: true
    }).subscribe({
      next: () => this.notification.success('All passengers boarded. Gate closed.')
    });
  }

  notifyMissingPassengers() {
    this.notification.warning(`Dispatched to OCC & Lead: ${this.missingPassengerCount} passenger(s) unboarded.`);
  }

  announcePassenger(p: MissingPassenger) {
    p.announced = true;
    this.notification.info(`Gate ${this.operation.gateNo || 'A1'}: Final boarding call for ${p.name} (Seat ${p.seat}).`);
  }

  offloadBag(p: MissingPassenger) {
    p.bagStatus = 'OFFLOADED';
    if (this.manifest && this.manifest.loadedBaggageCount > 0) {
      this.manifest.loadedBaggageCount--;
      this.api.updateBoarding(this.manifest.id, {
        loadedBaggageCount: this.manifest.loadedBaggageCount
      }).subscribe();
    }
    this.notification.warning(`[BRS Offload] Bag #${p.bagTag} for ${p.name} offloaded per ICAO/IATA security requirements.`);
  }

  restoreBag(p: MissingPassenger) {
    p.bagStatus = 'LOADED';
    if (this.manifest) {
      this.manifest.loadedBaggageCount = (this.manifest.loadedBaggageCount || 0) + 1;
      this.api.updateBoarding(this.manifest.id, {
        loadedBaggageCount: this.manifest.loadedBaggageCount
      }).subscribe();
    }
    this.notification.success(`Bag #${p.bagTag} reloaded into hold.`);
  }

  toggleClearance(status?: boolean) {
    if (!this.manifest) return;
    const targetStatus = status !== undefined ? status : !this.manifest.loadsheetApproved;

    this.approvalSubmitting = true;
    this.api.approveLoadsheet(this.manifest.id, 'Sarah Operations (Lead)', targetStatus).subscribe({
      next: (res) => {
        this.approvalSubmitting = false;
        if (res.success) {
          this.manifest.loadsheetApproved = targetStatus;
          this.manifest.approvedByRedcap = targetStatus ? 'Sarah Operations (Lead)' : null;
          this.manifest.departureClearanceGivenAt = targetStatus ? new Date() : null;
          if (targetStatus) {
            this.notification.success('Loadsheet approved. Aircraft released for pushback.');
          } else {
            this.notification.warning('Departure clearance revoked.');
          }
        } else {
          this.notification.error(res.message || 'Operation failed.');
        }
      },
      error: () => {
        this.approvalSubmitting = false;
        this.notification.error('Server communication error.');
      }
    });
  }
}
