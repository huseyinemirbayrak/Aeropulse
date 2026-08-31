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
      <!-- Aviation-themed background -->
      <div class="aviation-bg">
        <div class="plane-silhouette plane-1"></div>
        <div class="plane-silhouette plane-2"></div>
        <div class="grid-pattern"></div>
      </div>

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
            <mat-card-title>Welcome Back</mat-card-title>
            <mat-card-subtitle>Sign in to your account to continue</mat-card-subtitle>
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
      background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
      position: relative;
      overflow: hidden;
    }

    .aviation-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.1;
    }

    .plane-silhouette {
      position: absolute;
      font-size: 200px;
      opacity: 0.3;
    }

    .plane-1 {
      top: 10%;
      right: 10%;
      animation: float 20s ease-in-out infinite;
    }

    .plane-2 {
      bottom: 20%;
      left: 5%;
      animation: float 25s ease-in-out infinite reverse;
    }

    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(0deg, transparent 24%, rgba(25, 118, 210, 0.05) 25%, rgba(25, 118, 210, 0.05) 26%, transparent 27%, transparent 74%, rgba(25, 118, 210, 0.05) 75%, rgba(25, 118, 210, 0.05) 76%, transparent 77%, transparent),
        linear-gradient(90deg, transparent 24%, rgba(25, 118, 210, 0.05) 25%, rgba(25, 118, 210, 0.05) 26%, transparent 27%, transparent 74%, rgba(25, 118, 210, 0.05) 75%, rgba(25, 118, 210, 0.05) 76%, transparent 77%, transparent);
      background-size: 50px 50px;
    }

    @keyframes float {
      0%, 100% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(30px) translateY(-20px); }
    }

    .login-container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 420px;
      padding: 20px;
    }

    .branding-section {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo {
      font-size: 64px;
      margin-bottom: 16px;
      display: block;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .title {
      font-size: 32px;
      font-weight: 600;
      color: var(--primary-blue);
      margin: 0 0 8px 0;
      letter-spacing: 2px;
    }

    .subtitle {
      color: var(--text-secondary);
      margin: 0;
      font-size: 14px;
      letter-spacing: 0.5px;
    }

    .login-card {
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(25, 118, 210, 0.12);
      overflow: hidden;
    }

    mat-card-header {
      margin-bottom: 32px;
    }

    mat-card-title {
      font-size: 24px;
      color: var(--text-dark);
      margin-bottom: 8px;
    }

    mat-card-subtitle {
      color: var(--text-secondary);
      font-size: 14px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background-color: #FFEBEE;
      border-left: 4px solid #F44336;
      border-radius: 4px;
      margin-bottom: 20px;
      color: #C62828;
    }

    .error-banner mat-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
    }

    .login-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    mat-card-footer {
      border-top: 1px solid var(--border-light);
      padding-top: 24px;
    }

    .demo-section {
      display: block;
    }

    .demo-title {
      text-align: center;
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 16px 0;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .demo-btn {
      height: auto;
      padding: 12px 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .demo-btn mat-icon {
      display: block;
      margin: 0 auto 4px;
      width: 24px;
      height: 24px;
      font-size: 24px;
    }

    .demo-btn span {
      display: block;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .login-container {
        max-width: 100%;
      }

      .title {
        font-size: 28px;
      }

      .logo {
        font-size: 48px;
      }

      .demo-grid {
        grid-template-columns: 1fr;
      }

      .login-button {
        height: 44px;
        font-size: 14px;
      }
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
