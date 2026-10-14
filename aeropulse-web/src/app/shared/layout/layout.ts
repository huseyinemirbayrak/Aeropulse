import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { UserRole, Tenant } from '../../core/models';
import { SignalRService, LiveToastNotification } from '../../core/signalr.service';
import { TenantService } from '../../core/tenant.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo" *ngIf="!sidebarCollapsed">
            <span class="logo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </span>
            <span class="logo-text">AeroPulse</span>
          </div>
          <div class="logo" *ngIf="sidebarCollapsed">
            <span class="logo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </span>
          </div>
          <button class="toggle-btn" (click)="sidebarCollapsed = !sidebarCollapsed" [attr.aria-label]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
            {{ sidebarCollapsed ? '→' : '←' }}
          </button>
        </div>

        <nav class="sidebar-nav">
          @for (item of menuItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
              <span class="nav-icon-wrapper">
                <span class="nav-dot"></span>
              </span>
              <span class="nav-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info" *ngIf="!sidebarCollapsed">
            <div class="user-avatar">{{ userInitials }}</div>
            <div class="user-details">
              <div class="user-name">{{ authService.currentUser?.fullName }}</div>
              <div class="user-role">{{ roleBadge }}</div>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()">
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main class="main-content" [class.expanded]="sidebarCollapsed">
        <header class="top-header">
          <div class="header-left">
            <h2 class="page-title">{{ pageTitle }}</h2>
          </div>
          <div class="header-right">
            <div class="tenant-switcher-wrapper">
              <span class="tenant-label">Carrier Context:</span>
              <button type="button" class="tenant-select-box" (click)="toggleTenantDropdown()">
                <span class="tenant-dot" [style.background-color]="selectedTenantColor"></span>
                <span class="tenant-name">{{ selectedTenantName }}</span>
                <span class="tenant-arrow">▾</span>
              </button>

              <div class="tenant-dropdown-backdrop" *ngIf="tenantDropdownOpen" (click)="tenantDropdownOpen = false"></div>

              <div class="tenant-dropdown" *ngIf="tenantDropdownOpen">
                <div class="tenant-dropdown-header">Switch Carrier Context</div>
                
                <div class="tenant-option" [class.active]="!tenantService.currentTenant" (click)="onSelectTenant(null)">
                  <span class="tenant-dot" style="background-color: #8b5cf6;"></span>
                  <div class="tenant-opt-info">
                    <span class="tenant-opt-title">All Terminals (İGA Hub Authority)</span>
                    <span class="tenant-opt-sub">Consolidated aerodrome & ground telemetry</span>
                  </div>
                  <span class="check-mark" *ngIf="!tenantService.currentTenant">✓</span>
                </div>

                @for (tenant of (tenantService.tenants$ | async); track tenant.id) {
                  <div class="tenant-option" [class.active]="tenantService.currentTenant?.id === tenant.id" (click)="onSelectTenant(tenant)">
                    <span class="tenant-dot" [style.background-color]="tenant.primaryColor"></span>
                    <div class="tenant-opt-info">
                      <span class="tenant-opt-title">{{ tenant.name }} ({{ tenant.code }})</span>
                      <span class="tenant-opt-sub">{{ tenant.type === 'Airline' ? 'Commercial Airline' : tenant.type === 'GroundHandler' ? 'Ground Handling' : 'Aerodrome Authority' }}</span>
                    </div>
                    <span class="check-mark" *ngIf="tenantService.currentTenant?.id === tenant.id">✓</span>
                  </div>
                }
              </div>
            </div>

            <div class="zulu-clock font-mono">
              <span class="zulu-label">ZULU:</span> {{ utcTime }}
            </div>

            <div class="ws-badge" [class.connected]="(signalrService.isConnected$ | async)" [class.disconnected]="!(signalrService.isConnected$ | async)">
              <span class="ws-dot"></span>
              <span class="ws-text">{{ (signalrService.isConnected$ | async) ? 'Telemetry: Active' : 'Offline' }}</span>
            </div>

            <div class="header-badge">
              <span class="badge badge-info">{{ roleBadge }}</span>
            </div>
          </div>
        </header>

        <div class="toast-container" *ngIf="activeToasts.length > 0">
          @for (toast of activeToasts; track toast.id) {
            <div class="toast-card" [class]="'toast-' + toast.type" (click)="removeToast(toast.id)">
              <div class="toast-header">
                <span class="toast-title">{{ toast.title }}</span>
                <span class="toast-time">{{ toast.timestamp | date:'HH:mm:ss' }}</span>
              </div>
              <div class="toast-body">{{ toast.message }}</div>
            </div>
          }
        </div>

        <div class="content-area">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: #ffffff;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .sidebar {
      width: var(--sidebar-width, 240px);
      background: #0f172a;
      border-right: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
      overflow: hidden;
      transition: width 0.2s ease;
    }

    .sidebar.collapsed {
      width: 68px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      border-bottom: 1px solid #1e293b;
      height: var(--header-height, 60px);
      background: #0f172a;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(2, 132, 199, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 6px;
      color: #38bdf8;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 1.125rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    .toggle-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .toggle-btn:hover {
      background: #334155;
      color: #f8fafc;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.75rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      border-radius: 6px;
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.8125rem;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .nav-item:hover {
      background: #1e293b;
      color: #f8fafc;
    }

    .nav-item.active {
      background: #0369a1;
      color: #ffffff;
      font-weight: 600;
    }

    .nav-icon-wrapper {
      width: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.7;
    }

    .sidebar-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #1e293b;
      background: #090e17;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.625rem;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #1e293b;
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.75rem;
      color: #38bdf8;
      flex-shrink: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.8125rem;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .user-role {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .logout-btn {
      width: 100%;
      padding: 0.45rem 0.75rem;
      border-radius: 4px;
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .logout-btn:hover {
      background: #1e293b;
      color: #ef4444;
      border-color: #ef4444;
    }

    .main-content {
      margin-left: var(--sidebar-width, 240px);
      flex: 1;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      transition: margin-left 0.2s ease;
    }

    .main-content.expanded {
      margin-left: 68px;
    }

    .top-header {
      height: var(--header-height, 60px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .page-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .tenant-switcher-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tenant-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tenant-select-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      color: #0f172a;
      font-size: 0.8125rem;
      font-weight: 500;
      outline: none;
    }

    .tenant-select-box:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .tenant-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tenant-name {
      font-size: 0.8125rem;
      font-weight: 600;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tenant-arrow {
      font-size: 0.75rem;
      color: #64748b;
    }

    .tenant-dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 150;
    }

    .tenant-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      width: 320px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.25rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      z-index: 160;
    }

    .tenant-dropdown-header {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      padding: 0.5rem 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #f1f5f9;
    }

    .tenant-option {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
    }

    .tenant-option:hover {
      background: #f1f5f9;
    }

    .tenant-option.active {
      background: #f0f9ff;
    }

    .tenant-opt-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      text-align: left;
    }

    .tenant-opt-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0f172a;
    }

    .tenant-opt-sub {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .check-mark {
      color: #0284c7;
      font-weight: 700;
      font-size: 0.875rem;
    }

    .ws-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
    }

    .ws-badge.connected {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }

    .ws-badge.disconnected {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .ws-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .zulu-clock {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #334155;
      letter-spacing: 0.5px;
    }

    .zulu-label {
      color: #64748b;
      font-size: 0.6875rem;
    }

    .font-mono {
      font-family: monospace;
    }

    .badge-info {
      background: #f1f5f9;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .toast-container {
      position: fixed;
      top: 68px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
      pointer-events: none;
    }

    .toast-card {
      pointer-events: auto;
      cursor: pointer;
      background: #ffffff;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0284c7;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .toast-card.toast-info { border-left-color: #0284c7; }
    .toast-card.toast-success { border-left-color: #16a34a; }
    .toast-card.toast-warning { border-left-color: #d97706; }
    .toast-card.toast-danger { border-left-color: #dc2626; }

    .toast-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.25rem;
    }

    .toast-title {
      font-weight: 700;
      font-size: 0.8125rem;
      color: #0f172a;
      flex: 1;
    }

    .toast-time {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .toast-body {
      font-size: 0.75rem;
      color: #334155;
      line-height: 1.4;
    }

    .content-area {
      flex: 1;
      padding: 1.5rem;
      background: #f8fafc;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  menuItems: MenuItem[] = [];
  activeToasts: LiveToastNotification[] = [];
  private toastSub?: Subscription;
  tenantDropdownOpen = false;
  utcTime = '';
  private clockTimer?: any;

  constructor(
    public authService: AuthService,
    public signalrService: SignalRService,
    public tenantService: TenantService,
    private router: Router
  ) {
    this.buildMenu();
    this.updateClock();
  }

  updateClock(): void {
    const now = new Date();
    this.utcTime = now.toISOString().substring(11, 19) + 'Z';
  }

  get selectedTenantName(): string {
    const tenant = this.tenantService.currentTenant;
    if (!tenant) return 'All Terminals (İGA Hub Authority)';
    return `${tenant.code} - ${tenant.name}`;
  }

  get selectedTenantColor(): string {
    return this.tenantService.currentTenant?.primaryColor || '#8b5cf6';
  }

  toggleTenantDropdown(): void {
    this.tenantDropdownOpen = !this.tenantDropdownOpen;
  }

  onSelectTenant(tenant: Tenant | null): void {
    this.tenantDropdownOpen = false;
    this.tenantService.selectTenant(tenant);
  }

  ngOnInit(): void {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);

    this.toastSub = this.signalrService.toast$.subscribe((toast) => {
      this.activeToasts.push(toast);
      setTimeout(() => {
        this.removeToast(toast.id);
      }, 4000);
    });
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.toastSub?.unsubscribe();
  }

  removeToast(id: string): void {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
  }

  get userInitials(): string {
    const name = this.authService.currentUser?.fullName || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get pageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard') && url.includes('admin')) return 'Executive Administration Console';
    if (url.includes('users')) return 'Directory & Access Control';
    if (url.includes('my-tasks')) return 'Assigned Engineering Tasks';
    if (url.includes('inventory')) return 'MRO Spare Parts Inventory';
    if (url.includes('maintenance-log')) return 'Certified Maintenance Registry';
    if (url.includes('gse-fleet')) return 'Ground Support Equipment (GSE) Fleet';
    if (url.includes('ramp')) return 'Ramp Operations Dispatch';
    if (url.includes('turnaround')) return 'Flight Turnaround Coordination';
    if (url.includes('gate-agent')) return 'Gate Dispatch & Passenger Boarding';
    if (url.includes('loadsheet')) return 'Weight & Balance Loadsheet';
    if (url.includes('checklist')) return 'Turnaround Milestone Checklist';
    if (url.includes('operations')) return 'Active Flight Operations Schedule';
    if (url.includes('fault-reports')) return 'Airside Discrepancy & Defect Logs';
    if (url.includes('jet-bridges')) return 'Passenger Boarding Bridge Matrix';
    if (url.includes('my-faults')) return 'Logged Technician Defects';
    if (url.includes('fault-form')) return 'Submit Defect Report';
    if (url.includes('mro/dashboard')) return 'MRO Engineering Command Suite';
    if (url.includes('ops/dashboard')) return 'Operations Control Center (OCC)';
    return 'AeroPulse Enterprise Hub';
  }

  get roleBadge(): string {
    const role = this.authService.currentUser?.role;
    switch (role) {
      case UserRole.Admin: return 'System Administrator';
      case UserRole.MROEngineer: return 'MRO Avionics Engineer';
      case UserRole.OperationsManager: return 'Operations Manager (OCC)';
      case UserRole.FieldTechnician: return 'Field Ramp Technician';
      default: return role || 'Operator';
    }
  }

  logout(): void {
    this.authService.logout();
  }

  private buildMenu(): void {
    const role = this.authService.currentUser?.role;
    switch (role) {
      case UserRole.Admin:
        this.menuItems = [
          { label: 'System Overview', icon: 'dashboard', route: '/admin/dashboard' },
          { label: 'Directory Management', icon: 'people', route: '/admin/users' },
          { label: 'OCC Flight Radar', icon: 'radar', route: '/ops/dashboard' },
          { label: 'Flight Operations', icon: 'flight', route: '/ops/operations' },
          { label: 'GSE Ramp Fleet', icon: 'commute', route: '/ops/gse-fleet' },
          { label: 'Ramp Dispatch', icon: 'assignment', route: '/ops/ramp' },
          { label: 'Jet Bridges & Stands', icon: 'dock', route: '/ops/jet-bridges' },
          { label: 'Defect Reports', icon: 'warning', route: '/ops/fault-reports' },
          { label: 'MRO Engineering', icon: 'build', route: '/mro/dashboard' }
        ];
        break;
      case UserRole.MROEngineer:
        this.menuItems = [
          { label: 'Engineering Console', icon: 'dashboard', route: '/mro/dashboard' },
          { label: 'Assigned Tasks', icon: 'assignment', route: '/mro/my-tasks' },
          { label: 'Parts Inventory', icon: 'inventory', route: '/mro/inventory' },
          { label: 'Maintenance Registry', icon: 'history', route: '/mro/maintenance-log' },
          { label: 'Defect Reports', icon: 'warning', route: '/ops/fault-reports' },
          { label: 'Jet Bridges & Stands', icon: 'dock', route: '/ops/jet-bridges' }
        ];
        break;
      case UserRole.OperationsManager:
        this.menuItems = [
          { label: 'OCC Flight Radar', icon: 'radar', route: '/ops/dashboard' },
          { label: 'Flight Operations', icon: 'flight', route: '/ops/operations' },
          { label: 'GSE Ramp Fleet', icon: 'commute', route: '/ops/gse-fleet' },
          { label: 'Ramp Dispatch', icon: 'assignment', route: '/ops/ramp' },
          { label: 'Jet Bridges & Stands', icon: 'dock', route: '/ops/jet-bridges' },
          { label: 'Defect Reports', icon: 'warning', route: '/ops/fault-reports' },
          { label: 'MRO Status', icon: 'build', route: '/mro/dashboard' }
        ];
        break;
      case UserRole.FieldTechnician:
        this.menuItems = [
          { label: 'Ramp Work Orders', icon: 'assignment', route: '/tech/ramp-tasks' },
          { label: 'GSE Equipment', icon: 'commute', route: '/tech/gse-fleet' },
          { label: 'My Reported Defects', icon: 'report', route: '/tech/my-faults' },
          { label: 'Log New Defect', icon: 'add_alert', route: '/tech/fault-form' },
          { label: 'Jet Bridges & Stands', icon: 'dock', route: '/ops/jet-bridges' }
        ];
        break;
    }
  }
}
