import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';

interface AirlineCarrier {
  code: string;
  iata: string;
  name: string;
  color: string;
  type: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div class="enterprise-auth-container">
      <div class="auth-grid">
        <aside class="auth-hero-panel">
          <div class="hero-top">
            <div class="brand-cluster">
              <div class="brand-symbol">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="aeropulse-svg">
                  <path d="M16 2L20.5 11.5L30 13L23 20L25 30L16 25L7 30L9 20L2 13L11.5 11.5L16 2Z" fill="url(#brandGrad)" />
                  <defs>
                    <linearGradient id="brandGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#38BDF8" />
                      <stop offset="1" stop-color="#0284C7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <span class="brand-name">AeroPulse</span>
                <span class="brand-edition">Enterprise Platform</span>
              </div>
            </div>
            <div class="hub-status-badge">
              <span class="hub-dot"></span>
              <span>HUB LTFM (Istanbul) - Active Telemetry</span>
            </div>
          </div>

          <div class="hero-body">
            <h1 class="hero-headline">Mission-Critical Airside Operations & MRO Telemetry</h1>
            <p class="hero-description">
              Integrated real-time turnaround management, fleet airworthiness compliance, multi-tenant airline partitioning, and autonomous aerodrome crisis monitoring.
            </p>

            <div class="hero-specs-grid">
              <div class="spec-card">
                <div class="spec-header">
                  <span class="spec-label">Multi-Tenant Fleet Isolation</span>
                  <span class="spec-value">6 Carriers</span>
                </div>
                <p class="spec-sub">Encrypted logical partition across TK, PC, XQ, VF, LH, and İGA Airport Authority.</p>
              </div>
              <div class="spec-card">
                <div class="spec-header">
                  <span class="spec-label">Operations Control Center</span>
                  <span class="spec-value">5 Runways</span>
                </div>
                <p class="spec-sub">Live stand matrix, jet bridge telemetry, and automated windshear protocol.</p>
              </div>
              <div class="spec-card">
                <div class="spec-header">
                  <span class="spec-label">MRO Engineering Suite</span>
                  <span class="spec-value">ICAO / EASA</span>
                </div>
                <p class="spec-sub">Life-limited parts tracking, certification logs, and ramp task dispatch.</p>
              </div>
            </div>
          </div>

          <div class="hero-footer">
            <div class="compliance-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>ICAO Doc 9859 Safety & EASA Part-M Certified Architecture</span>
            </div>
            <span class="version-label">v2.4.0-Production</span>
          </div>
        </aside>

        <main class="auth-form-panel">
          <div class="form-wrapper">
            <header class="form-header">
              <h2 class="form-title">Operator Access Gateway</h2>
              <p class="form-subtitle">Authenticate with enterprise credentials to access your designated workspace.</p>
            </header>

            <div class="tenant-selector-block">
              <div class="selector-header">
                <span class="selector-label">Designated Airline / Authority Context</span>
                <span class="selected-tenant-pill" [style.background-color]="selectedCarrier.color">
                  {{ selectedCarrier.iata }}
                </span>
              </div>
              <div class="carrier-chips">
                @for (carrier of carriers; track carrier.code) {
                  <button
                    type="button"
                    class="carrier-chip-btn"
                    [class.active]="selectedTenantCode === carrier.code"
                    (click)="selectCarrier(carrier)"
                  >
                    <span class="carrier-indicator" [style.background-color]="carrier.color"></span>
                    <span class="carrier-code">{{ carrier.iata }}</span>
                    <span class="carrier-name">{{ carrier.name }}</span>
                  </button>
                }
              </div>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="credentials-form">
              <div class="input-block">
                <label class="field-label" for="login-email">Corporate Email Address</label>
                <mat-form-field appearance="outline" class="full-width">
                  <input
                    id="login-email"
                    matInput
                    type="email"
                    formControlName="email"
                    placeholder="operator@aeropulse.com"
                    [disabled]="isLoading"
                  />
                  <mat-icon matPrefix>alternate_email</mat-icon>
                  <mat-error *ngIf="getControl('email').hasError('required')">
                    Email address is required.
                  </mat-error>
                  <mat-error *ngIf="getControl('email').hasError('email')">
                    Please provide a valid corporate email.
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="input-block">
                <label class="field-label" for="login-password">Access Password</label>
                <mat-form-field appearance="outline" class="full-width">
                  <input
                    id="login-password"
                    matInput
                    [type]="hidePassword ? 'password' : 'text'"
                    formControlName="password"
                    placeholder="••••••••••••"
                    [disabled]="isLoading"
                  />
                  <mat-icon matPrefix>lock_outline</mat-icon>
                  <button
                    mat-icon-button
                    matSuffix
                    (click)="hidePassword = !hidePassword"
                    type="button"
                    [disabled]="isLoading"
                    tabindex="-1"
                  >
                    <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-error *ngIf="getControl('password').hasError('required')">
                    Password is required.
                  </mat-error>
                  <mat-error *ngIf="getControl('password').hasError('minlength')">
                    Password must be at least 6 characters.
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="error-banner" *ngIf="errorMessage">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage }}</span>
              </div>

              <button
                mat-flat-button
                type="submit"
                class="submit-button"
                [disabled]="!loginForm.valid || isLoading"
              >
                <mat-spinner *ngIf="isLoading" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!isLoading">login</mat-icon>
                <span>{{ isLoading ? 'Authenticating Credentials...' : 'Authenticate & Launch Console' }}</span>
              </button>
            </form>

            <div class="demo-personas-section">
              <div class="personas-header">
                <span>Select Quick Access Persona</span>
              </div>
              <div class="personas-grid">
                <button
                  type="button"
                  class="persona-btn"
                  (click)="fillCredentials('admin@aeropulse.com', 'Admin123!')"
                >
                  <span class="persona-role">System Administrator</span>
                  <span class="persona-email">admin&#64;aeropulse.com</span>
                </button>
                <button
                  type="button"
                  class="persona-btn"
                  (click)="fillCredentials('ops@aeropulse.com', 'Ops123!')"
                >
                  <span class="persona-role">Operations Manager (OCC)</span>
                  <span class="persona-email">ops&#64;aeropulse.com</span>
                </button>
                <button
                  type="button"
                  class="persona-btn"
                  (click)="fillCredentials('engineer@aeropulse.com', 'Eng123!')"
                >
                  <span class="persona-role">Lead MRO Engineer</span>
                  <span class="persona-email">engineer&#64;aeropulse.com</span>
                </button>
                <button
                  type="button"
                  class="persona-btn"
                  (click)="fillCredentials('tech@aeropulse.com', 'Tech123!')"
                >
                  <span class="persona-role">Field Ramp Technician</span>
                  <span class="persona-email">tech&#64;aeropulse.com</span>
                </button>
              </div>
            </div>

            <footer class="form-footer">
              <p>Confidential airside management portal. Unauthorized access is monitored, recorded, and subject to civil and criminal penalties.</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #0b132b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
    }

    .enterprise-auth-container {
      min-height: 100vh;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      background: radial-gradient(1200px 800px at 20% 20%, #172554 0%, #0b132b 100%);
    }

    .auth-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      width: 100%;
      min-height: 100vh;
    }

    .auth-hero-panel {
      padding: 48px 56px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(11, 19, 43, 0.95) 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .brand-cluster {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-symbol {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }

    .aeropulse-svg {
      width: 100%;
      height: 100%;
    }

    .brand-name {
      display: block;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #f8fafc;
    }

    .brand-edition {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .hub-status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 9999px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.3px;
    }

    .hub-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .hero-body {
      margin: 48px 0;
      max-width: 620px;
    }

    .hero-headline {
      font-size: 34px;
      line-height: 1.25;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      letter-spacing: -0.8px;
    }

    .hero-description {
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 36px 0;
    }

    .hero-specs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .spec-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 16px;
    }

    .spec-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
    }

    .spec-label {
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .spec-value {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
    }

    .spec-sub {
      font-size: 11px;
      line-height: 1.45;
      color: #64748b;
      margin: 0;
    }

    .hero-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .compliance-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 12px;
      font-weight: 500;
    }

    .version-label {
      font-size: 11px;
      color: #475569;
      font-family: monospace;
    }

    .auth-form-panel {
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
      overflow-y: auto;
    }

    .form-wrapper {
      width: 100%;
      max-width: 480px;
    }

    .form-header {
      margin-bottom: 28px;
    }

    .form-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.4px;
    }

    .form-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    .tenant-selector-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 24px;
    }

    .selector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .selector-label {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .selected-tenant-pill {
      font-size: 11px;
      font-weight: 700;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .carrier-chips {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .carrier-chip-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .carrier-chip-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .carrier-chip-btn.active {
      background: #f0f9ff;
      border-color: #0284c7;
      box-shadow: 0 0 0 1px #0284c7;
    }

    .carrier-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .carrier-code {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    .carrier-name {
      font-size: 10px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .credentials-form {
      margin-bottom: 24px;
    }

    .input-block {
      margin-bottom: 6px;
    }

    .field-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .full-width {
      width: 100%;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 10px 12px;
      color: #991b1b;
      font-size: 12px;
      margin-bottom: 16px;
    }

    .error-banner mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .submit-button {
      width: 100%;
      height: 44px;
      background: #0284c7 !important;
      color: #ffffff !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      letter-spacing: 0.2px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .submit-button:hover:not([disabled]) {
      background: #0369a1 !important;
    }

    .demo-personas-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 24px;
    }

    .personas-header {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .personas-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .persona-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: all 0.15s ease;
    }

    .persona-btn:hover {
      border-color: #0284c7;
      background: #f0f9ff;
    }

    .persona-role {
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
    }

    .persona-email {
      font-size: 10px;
      color: #64748b;
      font-family: monospace;
    }

    .form-footer {
      text-align: center;
    }

    .form-footer p {
      font-size: 11px;
      line-height: 1.5;
      color: #94a3b8;
      margin: 0;
    }

    @media (max-width: 960px) {
      .auth-grid {
        grid-template-columns: 1fr;
      }
      .auth-hero-panel {
        display: none;
      }
      .auth-form-panel {
        padding: 32px 24px;
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  errorMessage = '';

  carriers: AirlineCarrier[] = [
    { code: 'THY', iata: 'TK', name: 'Turkish Airlines', color: '#e30a17', type: 'Flag Carrier' },
    { code: 'PGS', iata: 'PC', name: 'Pegasus Airlines', color: '#f59e0b', type: 'Low-Cost Carrier' },
    { code: 'SXS', iata: 'XQ', name: 'SunExpress', color: '#f97316', type: 'Joint Venture' },
    { code: 'AJT', iata: 'VF', name: 'AJet', color: '#0284c7', type: 'Regional Fleet' },
    { code: 'DLH', iata: 'LH', name: 'Lufthansa', color: '#0f172a', type: 'International Star' },
    { code: 'IGA', iata: 'IGA', name: 'İGA Hub Authority', color: '#7c3aed', type: 'Aerodrome Authority' }
  ];

  selectedTenantCode = localStorage.getItem('aeropulse_tenant_id') || 'THY';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['admin@aeropulse.com', [Validators.required, Validators.email]],
      password: ['Admin123!', [Validators.required, Validators.minLength(6)]]
    });

    if (!localStorage.getItem('aeropulse_tenant_id')) {
      localStorage.setItem('aeropulse_tenant_id', 'THY');
    }
  }

  get selectedCarrier(): AirlineCarrier {
    return this.carriers.find(c => c.code === this.selectedTenantCode) || this.carriers[0];
  }

  selectCarrier(carrier: AirlineCarrier): void {
    this.selectedTenantCode = carrier.code;
    localStorage.setItem('aeropulse_tenant_id', carrier.code);
    this.notification.info(`Active Carrier Context: ${carrier.name} (${carrier.iata})`);
  }

  getControl(name: string) {
    return this.loginForm.get(name)!;
  }

  onLogin(): void {
    if (!this.loginForm.valid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.notification.success('Authentication confirmed. Routing to workspace...');

        const role = response.data?.user.role;
        if (role === 'Admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'OperationsManager') {
          this.router.navigate(['/ops/dashboard']);
        } else if (role === 'MROEngineer') {
          this.router.navigate(['/mro/dashboard']);
        } else if (role === 'FieldTechnician') {
          this.router.navigate(['/tech/ramp-tasks']);
        } else {
          this.router.navigate(['/ops/dashboard']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Authentication failed. Please verify credentials.';
        this.notification.error(this.errorMessage);
      }
    });
  }

  fillCredentials(email: string, password: string): void {
    this.loginForm.patchValue({ email, password });
    this.notification.info('Credentials populated for demo evaluation.');
  }
}
