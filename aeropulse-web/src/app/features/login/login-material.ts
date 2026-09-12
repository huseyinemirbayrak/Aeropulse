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
    <div class="login-wrapper">
      <div class="login-container">
        <!-- Logo & Branding -->
        <div class="branding-section">
          <div class="logo">✈</div>
          <h1 class="title">AeroPulse</h1>
          <p class="subtitle">Aviation & MRO Operations Management</p>
        </div>

        <!-- Login Card -->
        <mat-card class="login-card">
          <mat-card-header>
            <mat-card-title>Giriş Yap</mat-card-title>
            <mat-card-subtitle>Hesabınıza erişmek için bilgilerinizi girin</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
              <!-- Email Field -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email Address</mat-label>
                <input 
                  matInput 
                  type="email" 
                  formControlName="email"
                  placeholder="admin@aeropulse.com"
                  [disabled]="isLoading"
                />
                <mat-icon matPrefix>mail</mat-icon>
                <mat-error *ngIf="getControl('email').hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="getControl('email').hasError('email')">
                  Please enter a valid email
                </mat-error>
              </mat-form-field>

              <!-- Password Field -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input 
                  matInput 
                  [type]="hidePassword ? 'password' : 'text'" 
                  formControlName="password"
                  placeholder="••••••••"
                  [disabled]="isLoading"
                />
                <mat-icon matPrefix>lock</mat-icon>
                <button 
                  mat-icon-button 
                  matSuffix 
                  (click)="hidePassword = !hidePassword" 
                  type="button"
                  [disabled]="isLoading"
                >
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="getControl('password').hasError('required')">
                  Password is required
                </mat-error>
                <mat-error *ngIf="getControl('password').hasError('minlength')">
                  Password must be at least 6 characters
                </mat-error>
              </mat-form-field>

              <!-- Error Message -->
              <div class="error-banner" *ngIf="errorMessage">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Submit Button -->
              <button 
                mat-raised-button 
                color="primary"
                type="submit"
                class="login-button"
                [disabled]="!loginForm.valid || isLoading"
              >
                <mat-icon *ngIf="!isLoading">login</mat-icon>
                <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
                <span>{{ isLoading ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap' }}</span>
              </button>
            </form>
          </mat-card-content>

          <!-- 5 Airlines Selection -->
          <div class="airline-section">
            <div class="airline-section-header">
              <span class="airline-title">✈️ Çalışılacak Havayolu Şirketi:</span>
              <span class="active-airline-badge" [style.background-color]="selectedAirlineColor">
                {{ selectedAirlineName }}
              </span>
            </div>
            <div class="airline-grid">
              <button 
                type="button" 
                class="airline-btn" 
                [class.active]="selectedTenantCode === 'THY'"
                (click)="selectAirline('THY')"
              >
                <span class="airline-dot" style="background-color: #e30a17;"></span>
                <span>Türk Hava Yolları (TK)</span>
              </button>
              <button 
                type="button" 
                class="airline-btn" 
                [class.active]="selectedTenantCode === 'PGS'"
                (click)="selectAirline('PGS')"
              >
                <span class="airline-dot" style="background-color: #f59e0b;"></span>
                <span>Pegasus Airlines (PC)</span>
              </button>
              <button 
                type="button" 
                class="airline-btn" 
                [class.active]="selectedTenantCode === 'SXS'"
                (click)="selectAirline('SXS')"
              >
                <span class="airline-dot" style="background-color: #f97316;"></span>
                <span>SunExpress (XQ)</span>
              </button>
              <button 
                type="button" 
                class="airline-btn" 
                [class.active]="selectedTenantCode === 'AJT'"
                (click)="selectAirline('AJT')"
              >
                <span class="airline-dot" style="background-color: #0284c7;"></span>
                <span>AJet (VF)</span>
              </button>
              <button 
                type="button" 
                class="airline-btn" 
                [class.active]="selectedTenantCode === 'DLH'"
                (click)="selectAirline('DLH')"
              >
                <span class="airline-dot" style="background-color: #0f172a;"></span>
                <span>Lufthansa (LH)</span>
              </button>
              <button 
                type="button" 
                class="airline-btn" 
                [class.active]="selectedTenantCode === 'IGA'"
                (click)="selectAirline('IGA')"
              >
                <span class="airline-dot" style="background-color: #8b5cf6;"></span>
                <span>Tüm Havalimanı (İGA)</span>
              </button>
            </div>
          </div>

          <!-- Demo Accounts Section -->
          <mat-card-footer class="demo-section">
            <p class="demo-title">Hızlı Demo Hesapları:</p>
            <div class="demo-grid">
              <button 
                type="button"
                mat-stroked-button
                (click)="fillDemo('admin@aeropulse.com', 'Admin123!')"
                class="demo-btn"
              >
                <span>👑 Admin</span>
              </button>
              <button 
                type="button"
                mat-stroked-button
                (click)="fillDemo('ops@aeropulse.com', 'Ops123!')"
                class="demo-btn"
              >
                <span>🛫 Operasyon</span>
              </button>
              <button 
                type="button"
                mat-stroked-button
                (click)="fillDemo('engineer@aeropulse.com', 'Eng123!')"
                class="demo-btn"
              >
                <span>⚙️ Mühendis</span>
              </button>
              <button 
                type="button"
                mat-stroked-button
                (click)="fillDemo('tech@aeropulse.com', 'Tech123!')"
                class="demo-btn"
              >
                <span>🛠️ Teknisyen</span>
              </button>
              <button 
                type="button"
                mat-stroked-button
                (click)="fillDemo('viewer@aeropulse.com', 'View123!')"
                class="demo-btn"
              >
                <span>👁️ Viewer</span>
              </button>
            </div>
          </mat-card-footer>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    }

    .login-container {
      width: 100%;
      max-width: 400px;
      padding: 24px;
    }

    .branding-section {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 36px;
      margin-bottom: 8px;
      display: block;
      color: #111827;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px 0;
    }

    .subtitle {
      color: #6b7280;
      margin: 0;
      font-size: 13px;
    }

    .login-card {
      background: #ffffff !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 6px !important;
      box-shadow: none !important;
      padding: 24px;
    }

    mat-card-header {
      margin-bottom: 20px;
      padding: 0;
    }

    mat-card-title {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }

    mat-card-subtitle {
      color: #6b7280;
      font-size: 13px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
      margin-bottom: 16px;
      color: #b91c1c;
      font-size: 13px;
    }

    .error-banner mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .login-button {
      width: 100%;
      height: 40px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 4px;
      background: #2563eb !important;
      color: #ffffff !important;
      box-shadow: none !important;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .airline-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .airline-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 6px;
    }

    .airline-title {
      font-size: 11px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .active-airline-badge {
      font-size: 11px;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .airline-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .airline-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 500;
      color: #1f2937;
      cursor: pointer;
      text-align: left;
    }

    .airline-btn:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .airline-btn.active {
      background: #eff6ff;
      border-color: #3b82f6;
      font-weight: 700;
      color: #1d4ed8;
    }

    .airline-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    mat-card-footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      margin-top: 8px;
    }

    .demo-section {
      display: block;
    }

    .demo-title {
      text-align: center;
      color: #6b7280;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 10px 0;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .demo-btn {
      padding: 6px 4px;
      font-size: 11px;
      border: 1px solid #d1d5db !important;
      border-radius: 4px;
      color: #374151 !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  errorMessage = '';
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

  get selectedAirlineName(): string {
    switch (this.selectedTenantCode) {
      case 'THY': return 'Türk Hava Yolları (TK)';
      case 'PGS': return 'Pegasus Airlines (PC)';
      case 'SXS': return 'SunExpress (XQ)';
      case 'AJT': return 'AJet (VF)';
      case 'DLH': return 'Lufthansa (LH)';
      case 'IGA': return 'Tüm Havalimanı (İGA)';
      default: return this.selectedTenantCode;
    }
  }

  get selectedAirlineColor(): string {
    switch (this.selectedTenantCode) {
      case 'THY': return '#e30a17';
      case 'PGS': return '#f59e0b';
      case 'SXS': return '#f97316';
      case 'AJT': return '#0284c7';
      case 'DLH': return '#0f172a';
      case 'IGA': return '#8b5cf6';
      default: return '#3b82f6';
    }
  }

  selectAirline(code: string): void {
    this.selectedTenantCode = code;
    localStorage.setItem('aeropulse_tenant_id', code);
    this.notification.info(`Seçilen Havayolu: ${this.selectedAirlineName}`);
  }

  getControl(name: string) {
    return this.loginForm.get(name)!;
  }

  onLogin() {
    if (!this.loginForm.valid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.notification.success('Giriş başarılı! Yönlendiriliyorsunuz...');
        
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
          this.router.navigate(['/viewer/dashboard']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
        this.notification.error(this.errorMessage);
      }
    });
  }

  fillDemo(email: string, password: string) {
    this.loginForm.patchValue({ email, password });
    this.notification.info('Demo hesap bilgileri dolduruldu.');
  }
}
