import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';
import { SignalRService } from '../../../core/signalr.service';
import { WeatherData, CrisisStatus } from '../../../core/models';

@Component({
  selector: 'app-ops-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h1 class="section-title mb-0">Operations Control Center (OCC)</h1>
            <span class="live-pill"><span class="pulse-dot"></span> Telemetry Active (LTFM Hub)</span>
          </div>
          <p class="text-muted mt-1">Aerodrome airspace, inbound/outbound schedules, runway occupancy, and stand allocation</p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-refresh" (click)="loadAllData()" [disabled]="loading">
            <span [class.rotating]="loading">↺</span> Refresh
          </button>
          <button class="btn btn-secondary" routerLink="/ops/gse-fleet">GSE Fleet</button>
          <button class="btn btn-secondary" routerLink="/ops/ramp">Ramp Dispatch</button>
          <button class="btn btn-primary" routerLink="/ops/operations">Flight Schedule</button>
        </div>
      </div>

      <!-- METEOROLOGICAL & CRISIS SURVEILLANCE PANEL -->
      <div class="glass-card weather-banner mb-4" [class.crisis-active]="crisis?.isCrisisActive">
        <div class="weather-left">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="station-tag font-mono">LTFM / METAR</span>
            <span class="weather-condition">{{ weather?.description || 'Scattered clouds, high visibility' }}</span>
            <span class="crisis-pill" *ngIf="crisis?.isCrisisActive">
              <span class="pulse-dot red"></span> WINDSHEAR PROTOCOL ACTIVE: PBB STOWAGE ENGAGED
            </span>
            <span class="nominal-pill" *ngIf="!crisis?.isCrisisActive">
              <span class="pulse-dot green"></span> Aerodrome Wind Envelope: Nominal
            </span>
          </div>
          <div class="weather-metrics mt-2">
            <div class="metric-item">
              <span class="metric-label">TEMP</span>
              <span class="metric-val font-mono">{{ weather?.temperature | number:'1.0-0' }}°C</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">SURFACE WIND</span>
              <span class="metric-val font-mono" [class.text-danger]="(weather?.windSpeed || 0) * 3.6 >= 80">
                {{ (weather?.windSpeed || 0) * 3.6 | number:'1.1-1' }} km/h
                <small class="text-muted font-mono">({{ (weather?.windSpeed || 0) * 1.94384 | number:'1.0-0' }} kt)</small>
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">DIRECTION</span>
              <span class="metric-val font-mono">{{ weather?.windDirectionDegrees || 360 }}° N</span>
            </div>
            <div class="metric-item" *ngIf="weather?.windGust">
              <span class="metric-label">PEAK GUST</span>
              <span class="metric-val font-mono" [class.text-danger]="(weather?.windGust || 0) * 3.6 >= 80">
                {{ (weather?.windGust || 0) * 3.6 | number:'1.0-0' }} km/h
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">HUMIDITY</span>
              <span class="metric-val font-mono">{{ weather?.humidity || 65 }}%</span>
            </div>
            <div class="metric-item" *ngIf="crisis?.isCrisisActive">
              <span class="metric-label">BRIDGES SECURED</span>
              <span class="metric-val font-mono text-danger">{{ crisis?.disabledJetBridgesCount || 8 }} Units</span>
            </div>
          </div>
        </div>

        <div class="weather-actions">
          <button 
            *ngIf="!crisis?.isCrisisActive" 
            class="btn btn-sm btn-outline-danger" 
            (click)="simulateWindCrisis()" 
            [disabled]="crisisSubmitting"
            title="Simulate wind gusts above 80 km/h (45+ knots) to test automated boarding bridge lockdown"
          >
            {{ crisisSubmitting ? 'Engaging...' : 'Simulate Gale Storm (>80 km/h)' }}
          </button>

          <button 
            *ngIf="crisis?.isCrisisActive" 
            class="btn btn-sm btn-success" 
            (click)="resolveWindCrisis()" 
            [disabled]="crisisSubmitting"
            title="Subside wind velocity and restore passenger boarding bridges to service"
          >
            {{ crisisSubmitting ? 'Restoring...' : 'Restore Normal Aerodrome Envelope' }}
          </button>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">RUNWAY AVAILABILITY</span>
            <span class="stat-badge success">{{ overview?.availableRunways || 0 }} Open</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.totalRunways || 5 }}</span>
            <span class="stat-sub">Active Runways</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ overview?.availableRunways || 2 }} Available</span>
            <span class="bar-pill busy">{{ (overview?.totalRunways || 5) - (overview?.availableRunways || 2) }} Occupied</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">GATES & JET BRIDGES</span>
            <span class="stat-badge info">{{ overview?.availableGates || 0 }} Available</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.totalGates || 8 }}</span>
            <span class="stat-sub">{{ overview?.occupiedGates || 0 }} Occupied</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ overview?.availableGates || 4 }} Open</span>
            <span class="bar-pill occupied">{{ overview?.occupiedGates || 3 }} Active</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">AIR TRAFFIC</span>
            <span class="stat-badge warning" *ngIf="overview?.delayedOperations > 0">{{ overview?.delayedOperations }} Delayed</span>
            <span class="stat-badge success" *ngIf="overview?.delayedOperations === 0">On Schedule</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.activeOperations || 0 }}</span>
            <span class="stat-sub">Monitored Flights</span>
          </div>
          <div class="stat-footer-bar">
            <span class="text-muted" style="font-size: 0.8rem;">Automatic SLA alerting enabled</span>
          </div>
        </div>

        <a routerLink="/ops/gse-fleet" class="glass-card stat-card" style="text-decoration: none; color: inherit; cursor: pointer;">
          <div class="stat-header">
            <span class="stat-label">GSE APRON FLEET</span>
            <span class="stat-badge secondary">{{ overview?.totalGSE || 8 }} Units</span>
          </div>
          <div class="stat-main">
            <span class="stat-value">{{ overview?.idleGSE || 0 }}</span>
            <span class="stat-sub">Standby Units</span>
          </div>
          <div class="stat-footer-bar">
            <span class="bar-pill available">{{ overview?.idleGSE || 4 }} Idle</span>
            <span class="bar-pill busy">{{ overview?.busyGSE || 3 }} Deployed</span>
            <span class="bar-pill danger" *ngIf="overview?.outOfServiceGSE > 0">{{ overview?.outOfServiceGSE }} Maint</span>
          </div>
        </a>
      </div>

      <div class="glass-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="card-section-title">Live Runway Operational Status</h3>
            <p class="text-muted mb-0">LTFM runway telemetry for arrivals, departures, and maintenance holds</p>
          </div>
          <span class="badge info">5 Configured Runways</span>
        </div>

        <div class="runways-grid">
          <div *ngFor="let runway of runways" class="runway-card" [ngClass]="getRunwayClass(runway.status)">
            <div class="runway-header">
              <span class="runway-code">{{ runway.runwayCode }}</span>
              <span class="badge" [ngClass]="getRunwayBadgeClass(runway.status)">
                {{ getRunwayStatusText(runway.status) }}
              </span>
            </div>
            
            <div class="runway-visual">
              <div class="runway-line">
                <span class="runway-mode font-mono" *ngIf="runway.status === 1">ARRIVAL</span>
                <span class="runway-mode font-mono" *ngIf="runway.status === 2">DEPARTURE</span>
                <span class="runway-mode font-mono" *ngIf="runway.status === 3">CLOSED</span>
                <span class="runway-mode font-mono" *ngIf="runway.status === 0">AVAILABLE</span>
              </div>
            </div>

            <div class="runway-info">
              <div *ngIf="runway.currentFlightNumber" class="current-flight">
                <strong>Flight:</strong> {{ runway.currentFlightNumber }}
              </div>
              <div class="runway-specs">
                <span>{{ runway.lengthMeters }}m</span> • <span>{{ runway.surfaceType }}</span>
              </div>
            </div>

            <button class="btn btn-sm btn-outline mt-2 w-100" (click)="openRunwayModal(runway)">
              Update Status
            </button>
          </div>
        </div>
      </div>

      <div class="glass-card mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="card-section-title">Terminal Gate & Stand Allocation Matrix</h3>
            <p class="text-muted mb-0">Terminal 1 passenger boarding bridges and remote apron parking positions</p>
          </div>
          <div class="gate-filters">
            <button class="filter-btn" [class.active]="gateFilter === 'ALL'" (click)="gateFilter = 'ALL'">All ({{ gates.length }})</button>
            <button class="filter-btn" [class.active]="gateFilter === 'AVAILABLE'" (click)="gateFilter = 'AVAILABLE'">Available</button>
            <button class="filter-btn" [class.active]="gateFilter === 'OCCUPIED'" (click)="gateFilter = 'OCCUPIED'">Occupied</button>
          </div>
        </div>

        <div class="gates-grid">
          <div *ngFor="let gate of filteredGates" class="gate-card" [ngClass]="getGateClass(gate.status)">
            <div class="gate-top">
              <span class="gate-num">{{ gate.gateNumber }}</span>
              <span class="bridge-tag" *ngIf="gate.hasJetBridge">Jet Bridge</span>
              <span class="stand-tag" *ngIf="!gate.hasJetBridge">Remote Stand</span>
            </div>

            <div class="gate-body">
              <span class="gate-status-pill" [ngClass]="getGateBadgeClass(gate.status)">
                {{ getGateStatusText(gate.status) }}
              </span>

              <div *ngIf="gate.currentFlightNumber" class="gate-flight-box mt-2">
                <div class="gate-flight-no">FLT {{ gate.currentFlightNumber }}</div>
                <small *ngIf="gate.currentAircraftTailNumber" class="text-muted">{{ gate.currentAircraftTailNumber }}</small>
              </div>
              <div *ngIf="!gate.currentFlightNumber" class="gate-empty-box mt-2">
                <span class="text-muted">Available / Standby</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 class="card-section-title">Flight Operations & Gate Dispatch</h3>
            <p class="text-muted mb-0">Monitored flights with real-time gate re-assignment authorization</p>
          </div>
          <span class="badge info">{{ upcomingFlights.length }} Flights Tracked</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>FLIGHT</th>
                <th>AIRCRAFT</th>
                <th>GATE</th>
                <th>RUNWAY</th>
                <th>SCHEDULE</th>
                <th>STATUS</th>
                <th>DELAY</th>
                <th style="text-align: right;">DISPATCH ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let flight of upcomingFlights">
                <td>
                  <span class="flight-pill">{{ flight.flightNumber }}</span>
                </td>
                <td>
                  <strong>{{ flight.tailNumber || 'Unassigned' }}</strong>
                  <div class="text-muted" style="font-size: 0.75rem;">{{ flight.aircraftModel || 'Commercial' }}</div>
                </td>
                <td>
                  <span class="gate-badge-table">{{ flight.gateNo || 'Standby' }}</span>
                </td>
                <td>
                  <span class="runway-badge-table">{{ flight.assignedRunwayCode || '35L' }}</span>
                </td>
                <td>
                  <div>{{ flight.arrivalTime | date:'shortTime' }} - {{ flight.departureTime | date:'shortTime' }}</div>
                  <small class="text-muted">{{ flight.arrivalTime | date:'mediumDate' }}</small>
                </td>
                <td>
                  <span class="status-pill" [ngClass]="flight.delayMinutes > 0 ? 'delayed' : 'on-time'">
                    {{ flight.status }}
                  </span>
                </td>
                <td>
                  <span *ngIf="flight.delayMinutes > 0" class="badge danger">+{{ flight.delayMinutes }}m</span>
                  <span *ngIf="!flight.delayMinutes || flight.delayMinutes === 0" class="badge success">On Time</span>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-warning" (click)="openOverrideModal(flight)" title="Manual Gate Reassignment">
                    Reassign Gate
                  </button>
                  <a class="btn btn-sm btn-primary ml-1" [routerLink]="['/ops/turnaround', flight.id]" title="Turnaround Management">
                    Turnaround
                  </a>
                  <a class="btn btn-sm btn-outline ml-1" [routerLink]="['/ops/gate-agent', flight.id]" title="Gate Dispatch & Boarding">
                    Boarding
                  </a>
                </td>
              </tr>

              <tr *ngIf="upcomingFlights.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">
                  No active flight operations registered.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-backdrop" *ngIf="showOverrideModal">
        <div class="modal-content glass-card animate-fade-in">
          <div class="modal-header">
            <h3>OCC Gate & Stand Reassignment</h3>
            <button class="close-btn" (click)="closeOverrideModal()">✕</button>
          </div>
          
          <div class="modal-body" *ngIf="selectedFlight">
            <div class="alert-info-box mb-3">
              <strong>Flight:</strong> {{ selectedFlight.flightNumber }} ({{ selectedFlight.tailNumber }})<br>
              <strong>Current Gate:</strong> <span class="badge warning">{{ selectedFlight.gateNo || 'None' }}</span>
            </div>

            <div class="form-group mb-3">
              <label>Select Target Gate / Stand <span style="color: #ef4444;">*</span></label>
              <select class="form-control" [(ngModel)]="overrideNewGate">
                <option value="" disabled>-- Select Available Gate --</option>
                <option *ngFor="let g of availableGateOptions" [value]="g.gateNumber">
                  {{ g.gateNumber }} ({{ g.hasJetBridge ? 'Jet Bridge' : 'Remote Stand' }} - {{ g.status === 0 ? 'Open' : 'Occupied' }})
                </option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label>Reassignment Justification <span style="color: #ef4444;">*</span></label>
              <select class="form-control" [(ngModel)]="overrideReason">
                <option value="Preceding flight turnaround delay">Preceding flight turnaround delay</option>
                <option value="Passenger boarding bridge technical fault">Passenger boarding bridge technical fault</option>
                <option value="Widebody airframe parking requirement">Widebody airframe parking requirement</option>
                <option value="Urgent unscheduled maintenance (AOG)">Urgent unscheduled maintenance (AOG)</option>
                <option value="OCC Duty Chief operational order">OCC Duty Chief operational order</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeOverrideModal()">Cancel</button>
            <button class="btn btn-primary" (click)="submitOverride()" [disabled]="!overrideNewGate || overrideSubmitting">
              <span *ngIf="!overrideSubmitting">Confirm Reassignment</span>
              <span *ngIf="overrideSubmitting">Processing...</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" *ngIf="showRunwayModal">
        <div class="modal-content glass-card animate-fade-in">
          <div class="modal-header">
            <h3>Update Runway Status (Runway {{ selectedRunway?.runwayCode }})</h3>
            <button class="close-btn" (click)="closeRunwayModal()">✕</button>
          </div>

          <div class="modal-body" *ngIf="selectedRunway">
            <div class="form-group mb-3">
              <label>Runway Status</label>
              <select class="form-control" [(ngModel)]="runwayNewStatus">
                <option [ngValue]="0">Available</option>
                <option [ngValue]="1">Landing In Progress</option>
                <option [ngValue]="2">Takeoff In Progress</option>
                <option [ngValue]="3">Closed For Maintenance</option>
                <option [ngValue]="4">Inspection In Progress</option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label>Associated Flight Number (Optional)</label>
              <input type="text" class="form-control" [(ngModel)]="runwayFlightNumber" placeholder="e.g. TK1984">
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeRunwayModal()">Cancel</button>
            <button class="btn btn-primary" (click)="submitRunwayUpdate()" [disabled]="runwaySubmitting">
              <span *ngIf="!runwaySubmitting">Save Runway Status</span>
              <span *ngIf="runwaySubmitting">Saving...</span>
            </button>
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
      background: #ffffff;
      color: #111827;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .d-flex { display: flex; }
    .align-items-center { align-items: center; }
    .justify-content-between { justify-content: space-between; }
    .gap-2 { gap: 0.5rem; }
    .mb-0 { margin-bottom: 0; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .ml-1 { margin-left: 0.25rem; }
    .w-100 { width: 100%; }

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
      align-items: center;
    }

    .btn-refresh {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
      padding: 0.45rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8125rem;
    }
    .btn-refresh:hover {
      background: #f9fafb;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 4px;
      color: #15803d;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
    }
    .pulse-dot.red { background: #dc2626; }
    .pulse-dot.green { background: #16a34a; }

    .weather-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      border-left: 4px solid #0284c7;
      background: #ffffff;
      padding: 1.25rem;
      border-radius: 8px;
    }
    .weather-banner.crisis-active {
      border-left-color: #dc2626;
      background: #fff5f5;
    }

    .station-tag {
      font-size: 0.75rem;
      font-weight: 800;
      padding: 2px 6px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      color: #0f172a;
    }

    .weather-condition {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1e293b;
    }

    .crisis-pill {
      font-size: 0.6875rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .nominal-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .weather-metrics {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .metric-label {
      font-size: 0.625rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .metric-val {
      font-size: 1rem;
      font-weight: 800;
      color: #0f172a;
    }

    .btn-outline-danger {
      background: #ffffff;
      border: 1px solid #fca5a5;
      color: #dc2626;
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .btn-outline-danger:hover {
      background: #fef2f2;
    }

    .btn-success {
      background: #16a34a;
      border: 1px solid #16a34a;
      color: #ffffff;
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .btn-success:hover {
      background: #15803d;
    }

    .grid { display: grid; gap: 1rem; }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }

    .stat-card {
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      letter-spacing: 0.05em;
    }

    .stat-badge {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .stat-badge.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .stat-badge.warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
    .stat-badge.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .stat-badge.secondary { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }

    .stat-main {
      margin: 0.75rem 0;
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
    }
    .stat-sub {
      font-size: 0.8125rem;
      color: #6b7280;
    }

    .stat-footer-bar {
      display: flex;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3f4f6;
    }

    .bar-pill {
      font-size: 0.6875rem;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 500;
    }
    .bar-pill.available { background: #f0fdf4; color: #166534; }
    .bar-pill.busy { background: #eff6ff; color: #1d4ed8; }
    .bar-pill.occupied { background: #fef2f2; color: #991b1b; }
    .bar-pill.danger { background: #fef2f2; color: #b91c1c; }

    .runways-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .runway-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.875rem;
      background: #fafafa;
    }
    .runway-card.available { border-top: 3px solid #16a34a; }
    .runway-card.landing { border-top: 3px solid #f59e0b; }
    .runway-card.takeoff { border-top: 3px solid #2563eb; }
    .runway-card.closed { border-top: 3px solid #dc2626; }

    .runway-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .runway-code {
      font-weight: 700;
      font-size: 1.125rem;
      color: #111827;
    }

    .runway-visual {
      background: #f3f4f6;
      border-radius: 4px;
      padding: 0.5rem;
      text-align: center;
      margin: 0.5rem 0;
    }

    .runway-specs {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .gates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
    }

    .gate-card {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 0.625rem;
      background: #ffffff;
    }
    .gate-card.available { border-left: 3px solid #16a34a; }
    .gate-card.occupied { border-left: 3px solid #dc2626; }
    .gate-card.reserved { border-left: 3px solid #f59e0b; }

    .gate-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .gate-num {
      font-weight: 700;
      font-size: 0.875rem;
      color: #111827;
    }
    .bridge-tag, .stand-tag {
      font-size: 0.625rem;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .bridge-tag { background: #eff6ff; color: #1d4ed8; }
    .stand-tag { background: #f3f4f6; color: #4b5563; }

    .gate-status-pill {
      display: inline-block;
      font-size: 0.6875rem;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .gate-status-pill.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .gate-status-pill.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .gate-status-pill.warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

    .gate-flight-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      padding: 3px;
    }
    .gate-flight-no {
      font-size: 0.75rem;
      font-weight: 700;
      color: #1d4ed8;
    }
    .gate-empty-box {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .table-responsive { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
    }
    .data-table th {
      text-align: left;
      padding: 0.625rem 0.75rem;
      color: #4b5563;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .data-table td {
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      color: #111827;
      vertical-align: middle;
      background: #ffffff;
    }
    .flight-pill {
      font-weight: 600;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
    }
    .gate-badge-table, .runway-badge-table {
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 0.75rem;
    }
    .gate-badge-table { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; }
    .runway-badge-table { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-content {
      width: 100%;
      max-width: 480px;
      padding: 1.5rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      color: #111827;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .modal-header h3 { margin: 0; font-size: 1.125rem; color: #111827; font-weight: 600; }
    .close-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.25rem;
      cursor: pointer;
    }
    .close-btn:hover { color: #111827; }
    .modal-body label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.35rem;
      color: #374151;
    }
    .alert-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 0.8125rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      color: #111827;
      font-size: 0.875rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #2563eb;
    }
  `]
})
export class OpsDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  overview: any = null;
  runways: any[] = [];
  gates: any[] = [];
  upcomingFlights: any[] = [];
  gateFilter: 'ALL' | 'AVAILABLE' | 'OCCUPIED' = 'ALL';

  showOverrideModal = false;
  selectedFlight: any = null;
  overrideNewGate = '';
  overrideReason = 'Preceding flight turnaround delay';
  overrideSubmitting = false;

  showRunwayModal = false;
  selectedRunway: any = null;
  runwayNewStatus: number = 0;
  runwayFlightNumber = '';
  runwaySubmitting = false;

  weather: WeatherData | null = null;
  crisis: CrisisStatus | null = null;
  crisisSubmitting = false;

  private pollTimer: any = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private notification: NotificationService,
    private signalr: SignalRService
  ) {}

  ngOnInit() {
    this.loadAllData();
    this.loadWeatherAndCrisis();

    this.subs.push(
      this.signalr.weatherAlert$.subscribe(() => {
        this.loadWeatherAndCrisis();
        this.loadAllData(true);
      }),

      this.signalr.gateOverride$.subscribe((ev) => {
        const flight = this.upcomingFlights.find(f => f.flightNumber === ev.flightNumber || f.id === ev.operationId);
        if (flight) {
          flight.gateNo = ev.newGateNumber;
        }

        if (ev.oldGateNumber) {
          const oldG = this.gates.find(g => g.gateNumber === ev.oldGateNumber);
          if (oldG) {
            oldG.status = 0;
            oldG.currentFlightNumber = null;
          }
        }
        const newG = this.gates.find(g => g.gateNumber === ev.newGateNumber);
        if (newG) {
          newG.status = 1;
          newG.currentFlightNumber = ev.flightNumber;
        }

        if (this.overview) {
          this.overview.availableGates = this.gates.filter(g => g.status === 0).length;
          this.overview.occupiedGates = this.gates.filter(g => g.status === 1 || g.status === 2).length;
        }
      }),

      this.signalr.gse$.subscribe(() => {
        this.loadAllData(true);
      }),

      this.signalr.turnaround$.subscribe(() => {
        this.loadAllData(true);
      })
    );

    this.pollTimer = setInterval(() => {
      this.loadAllData(true);
    }, 30000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  loadAllData(silent = false) {
    if (!silent) this.loading = true;

    this.api.getOccOverview().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.overview = res.data;
          this.runways = res.data.runways || [];
          this.gates = res.data.gates || [];
          this.upcomingFlights = res.data.upcomingFlights || [];
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to load OCC telemetry:', err);
      }
    });
  }

  loadWeatherAndCrisis() {
    this.api.getCurrentWeather('LTFM').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.weather = res.data;
        }
      }
    });

    this.api.getCrisisStatus().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.crisis = res.data;
        }
      }
    });
  }

  simulateWindCrisis() {
    this.crisisSubmitting = true;
    this.api.triggerWindCrisis({ cityCode: 'LTFM', windSpeedKmH: 88.5, reason: 'High wind gust simulation (>80 km/h)' }).subscribe({
      next: (res) => {
        this.crisisSubmitting = false;
        if (res.success) {
          this.notification.warning('Gale windstorm crisis simulated. Passenger boarding bridges locked down.');
          this.loadWeatherAndCrisis();
          this.loadAllData(true);
        } else {
          this.notification.error(res.message || 'Crisis trigger failed.');
        }
      },
      error: (err) => {
        this.crisisSubmitting = false;
        this.notification.error(err.error?.message || 'Error triggering crisis.');
      }
    });
  }

  resolveWindCrisis() {
    this.crisisSubmitting = true;
    this.api.resolveWindCrisis({ cityCode: 'LTFM', windSpeedKmH: 24.0 }).subscribe({
      next: (res) => {
        this.crisisSubmitting = false;
        if (res.success) {
          this.notification.success('Aerodrome wind conditions normalized. Bridges returned to service.');
          this.loadWeatherAndCrisis();
          this.loadAllData(true);
        } else {
          this.notification.error(res.message || 'Crisis resolution failed.');
        }
      },
      error: (err) => {
        this.crisisSubmitting = false;
        this.notification.error(err.error?.message || 'Error resolving crisis.');
      }
    });
  }

  get filteredGates(): any[] {
    if (this.gateFilter === 'AVAILABLE') {
      return this.gates.filter(g => g.status === 0);
    }
    if (this.gateFilter === 'OCCUPIED') {
      return this.gates.filter(g => g.status === 1 || g.status === 2);
    }
    return this.gates;
  }

  get availableGateOptions(): any[] {
    return this.gates;
  }

  getRunwayStatusText(status: number): string {
    switch (status) {
      case 0: return 'AVAILABLE';
      case 1: return 'LANDING IN PROGRESS';
      case 2: return 'TAKEOFF IN PROGRESS';
      case 3: return 'CLOSED (MAINTENANCE)';
      case 4: return 'INSPECTION';
      default: return 'UNKNOWN';
    }
  }

  getRunwayClass(status: number): string {
    switch (status) {
      case 0: return 'available';
      case 1: return 'landing';
      case 2: return 'takeoff';
      case 3: return 'closed';
      default: return '';
    }
  }

  getRunwayBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'success';
      case 1: return 'warning';
      case 2: return 'info';
      case 3: return 'danger';
      default: return 'secondary';
    }
  }

  getGateStatusText(status: number): string {
    switch (status) {
      case 0: return 'AVAILABLE';
      case 1: return 'OCCUPIED';
      case 2: return 'RESERVED';
      case 3: return 'MAINTENANCE';
      default: return 'UNKNOWN';
    }
  }

  getGateClass(status: number): string {
    switch (status) {
      case 0: return 'available';
      case 1: return 'occupied';
      case 2: return 'reserved';
      default: return '';
    }
  }

  getGateBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'success';
      case 1: return 'danger';
      case 2: return 'warning';
      default: return 'secondary';
    }
  }

  openOverrideModal(flight: any) {
    this.selectedFlight = flight;
    this.overrideNewGate = '';
    this.overrideReason = 'Preceding flight turnaround delay';
    this.showOverrideModal = true;
  }

  closeOverrideModal() {
    this.showOverrideModal = false;
    this.selectedFlight = null;
  }

  submitOverride() {
    if (!this.selectedFlight || !this.overrideNewGate) return;

    this.overrideSubmitting = true;
    this.api.overrideGate({
      operationId: this.selectedFlight.id,
      newGateNumber: this.overrideNewGate,
      reason: this.overrideReason
    }).subscribe({
      next: (res) => {
        this.overrideSubmitting = false;
        if (res.success) {
          this.notification.success(`Gate reassigned: ${this.selectedFlight.flightNumber} -> Gate ${this.overrideNewGate}`);
          this.closeOverrideModal();
          this.loadAllData();
        } else {
          this.notification.error(res.message || 'Unable to reassign gate.');
        }
      },
      error: (err) => {
        this.overrideSubmitting = false;
        this.notification.error(err.error?.message || 'Error occurred during gate reassignment.');
      }
    });
  }

  openRunwayModal(runway: any) {
    this.selectedRunway = runway;
    this.runwayNewStatus = runway.status;
    this.runwayFlightNumber = runway.currentFlightNumber || '';
    this.showRunwayModal = true;
  }

  closeRunwayModal() {
    this.showRunwayModal = false;
    this.selectedRunway = null;
  }

  submitRunwayUpdate() {
    if (!this.selectedRunway) return;

    this.runwaySubmitting = true;
    this.api.updateRunwayStatus(this.selectedRunway.id, {
      status: Number(this.runwayNewStatus),
      currentFlightNumber: this.runwayFlightNumber || null
    }).subscribe({
      next: (res) => {
        this.runwaySubmitting = false;
        if (res.success) {
          this.notification.success(`Runway ${this.selectedRunway.runwayCode} status updated successfully.`);
          this.closeRunwayModal();
          this.loadAllData();
        } else {
          this.notification.error(res.message || 'Unable to update runway status.');
        }
      },
      error: (err) => {
        this.runwaySubmitting = false;
        this.notification.error(err.error?.message || 'Error occurred updating runway.');
      }
    });
  }
}
