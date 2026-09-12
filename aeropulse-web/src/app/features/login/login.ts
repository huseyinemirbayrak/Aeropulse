import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-container">
        <div class="login-brand">
          <div class="brand-icon">✈</div>
          <h1>AeroPulse</h1>
          <p>Aviation & MRO Operations Hub</p>
        </div>

        <div class="login-card glass-card">
          <h2>Sign In</h2>
          <p class="login-subtitle">Enter your credentials to access the platform</p>

          <form (ngSubmit)="onLogin()" class="login-form">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                type="email"
                id="email"
                class="form-control"
                [(ngModel)]="email"
                name="email"
                placeholder="admin&#64;aeropulse.com"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                class="form-control"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter your password"
                required
                autocomplete="current-password"
              />
            </div>

            <div class="error-message" *ngIf="errorMessage">
              <span>⚠️</span> {{ errorMessage }}
            </div>

            <button type="submit" class="btn btn-primary login-btn" [disabled]="loading">
              <span class="loading-spinner" *ngIf="loading"></span>
              <span *ngIf="!loading">Sign In</span>
              <span *ngIf="loading">Authenticating...</span>
            </button>
          </form>

          <div class="demo-accounts">
            <p>Demo Accounts</p>
            <div class="demo-grid">
              <button class="demo-btn" (click)="fillDemo('admin&#64;aeropulse.com', 'Admin123!')">
                <span class="demo-role">🔑 Admin</span>
              </button>
              <button class="demo-btn" (click)="fillDemo('engineer&#64;aeropulse.com', 'Eng123!')">
                <span class="demo-role">🔧 MRO Engineer</span>
              </button>
              <button class="demo-btn" (click)="fillDemo('viewer&#64;aeropulse.com', 'View123!')">
                <span class="demo-role">📊 Viewer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
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

    .login-brand {
      text-align: center;
      margin-bottom: 24px;
    }

    .brand-icon {
      width: 48px;
      height: 48px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      margin: 0 auto 0.75rem;
      color: #111827;
    }

    .login-brand h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
    }

    .login-brand p {
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .login-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 24px;
    }

    .login-card h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .login-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .login-btn {
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      justify-content: center;
      margin-top: 0.5rem;
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--border-radius-sm);
      padding: 0.75rem 1rem;
      color: var(--color-danger);
      font-size: 0.875rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .demo-accounts {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }

    .demo-accounts > p {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.75rem;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .demo-btn {
      padding: 0.5rem;
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      color: var(--text-secondary);
      font-family: 'Inter', sans-serif;
    }

    .demo-btn:hover {
      background: rgba(0, 212, 255, 0.12);
      border-color: var(--border-active);
      color: var(--text-primary);
    }

    .demo-role {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .login-btn .loading-spinner {
      width: 18px;
      height: 18px;
      border-width: 2px;
    }

    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isLoggedIn) {
      this.router.navigate([this.authService.getDefaultRoute()]);
    }
  }

  fillDemo(email: string, password: string): void {
    this.email = email;
    this.password = password;
    this.errorMessage = '';
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.router.navigate([this.authService.getDefaultRoute()]);
          } else {
            this.errorMessage = res.message;
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Connection error. Is the API running?';
        }
      });
  }
}
