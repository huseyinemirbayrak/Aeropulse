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
                <span>{{ isLoading ? 'Signing In...' : 'Sign In' }}</span>
              </button>
            </form>
          </mat-card-content>

          <!-- Demo Accounts Section -->
          <mat-card-footer class="demo-section">
            <p class="demo-title">Demo Accounts:</p>
            <div class="demo-grid">
              <button 
                mat-stroked-button
                (click)="fillDemo('admin@aeropulse.com', 'Admin123!')"
                class="demo-btn"
              >
                <mat-icon>admin_panel_settings</mat-icon>
                <span>Admin</span>
              </button>
              <button 
                mat-stroked-button
                (click)="fillDemo('engineer@aeropulse.com', 'Eng123!')"
                class="demo-btn"
              >
                <mat-icon>engineering</mat-icon>
                <span>Engineer</span>
              </button>
              <button 
                mat-stroked-button
                (click)="fillDemo('viewer@aeropulse.com', 'View123!')"
                class="demo-btn"
              >
                <mat-icon>visibility</mat-icon>
                <span>Viewer</span>
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
      margin: 0 0 12px 0;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .demo-btn {
      padding: 8px 4px;
      font-size: 11px;
      border: 1px solid #d1d5db !important;
      border-radius: 4px;
      color: #374151 !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }

    .demo-btn mat-icon {
      display: block;
      margin: 0 auto 2px;
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .demo-btn span {
      display: block;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  errorMessage = '';

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
        this.notification.success('✅ Login successful! Redirecting...');
        
        // Redirect based on role
        if (response.data?.user.role === 'Admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (response.data?.user.role === 'MROEngineer') {
          this.router.navigate(['/mro/dashboard']);
        } else {
          this.router.navigate(['/viewer/dashboard']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
        this.notification.error(this.errorMessage);
      }
    });
  }

  fillDemo(email: string, password: string) {
    this.loginForm.patchValue({ email, password });
    this.notification.info('Demo credentials filled. Click Sign In to login.');
  }
}
