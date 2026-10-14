import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-card">
        <div class="security-shield">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="status-code">SECURITY CLEARANCE RESTRICTED (HTTP 403)</div>
        <h1 class="forbidden-title">Access Denied</h1>
        <p class="forbidden-desc">Your operational role does not possess the requisite security delegation or certificate authorization for this terminal view.</p>
        <div class="policy-notice">
          <strong>Mandate Part-145 / ICAO Annex 9:</strong> All unauthenticated or cross-clearance navigation attempts are logged to the OCC audit trail.
        </div>
        <div class="forbidden-actions">
          <a routerLink="/login" class="btn btn-primary">Return to Operations Sign-In</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forbidden-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary, #f8fafc);
      padding: 2rem;
    }

    .forbidden-card {
      text-align: center;
      max-width: 540px;
      padding: 3rem 2.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    }

    .security-shield {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(220, 38, 38, 0.08);
      color: var(--color-danger, #dc2626);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .status-code {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--color-danger, #dc2626);
      margin-bottom: 0.5rem;
    }

    .forbidden-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
      color: #0f172a;
    }

    .forbidden-desc {
      color: #475569;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .policy-notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid var(--color-warning, #d97706);
      border-radius: 6px;
      padding: 0.875rem 1rem;
      font-size: 0.8125rem;
      color: #334155;
      text-align: left;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .forbidden-actions {
      display: flex;
      justify-content: center;
    }
  `]
})
export class ForbiddenComponent {}
