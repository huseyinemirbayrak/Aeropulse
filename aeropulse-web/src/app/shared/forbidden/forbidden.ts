import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-card glass-card">
        <div class="forbidden-icon">🚫</div>
        <h1>403 — Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <p class="sub-text">Contact your administrator if you believe this is an error.</p>
        <a routerLink="/login" class="btn btn-primary">Back to Login</a>
      </div>
    </div>
  `,
  styles: [`
    .forbidden-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
    }

    .forbidden-card {
      text-align: center;
      max-width: 480px;
      padding: 3rem;
    }

    .forbidden-icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: var(--color-danger);
    }

    p {
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .sub-text {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }
  `]
})
export class ForbiddenComponent {}
