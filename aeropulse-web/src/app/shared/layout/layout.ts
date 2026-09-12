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
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo" *ngIf="!sidebarCollapsed">
            <span class="logo-icon">✈</span>
            <span class="logo-text">AeroPulse</span>
          </div>
          <div class="logo" *ngIf="sidebarCollapsed">
            <span class="logo-icon">✈</span>
          </div>
          <button class="toggle-btn" (click)="sidebarCollapsed = !sidebarCollapsed">
            {{ sidebarCollapsed ? '→' : '←' }}
          </button>
        </div>
        <nav class="sidebar-nav">
          @for (item of menuItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="sidebar-footer">
          <div class="user-info" *ngIf="!sidebarCollapsed">
            <div class="user-avatar">{{ userInitials }}</div>
            <div class="user-details">
              <div class="user-name">{{ authService.currentUser?.fullName }}</div>
              <div class="user-role">{{ authService.currentUser?.roleName }}</div>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()">
            <span>⏻</span>
            <span *ngIf="!sidebarCollapsed">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content" [class.expanded]="sidebarCollapsed">
        <header class="top-header">
          <div class="header-left">
            <h2 class="page-title">{{ pageTitle }}</h2>
          </div>
          <div class="header-right">
            <!-- Firma / Kiraci Secici -->
            <div class="tenant-switcher-wrapper">
              <span class="tenant-label">✈️ Aktif Havayolu / Firma:</span>
              <button type="button" class="tenant-select-box" (click)="toggleTenantDropdown()">
                <span class="tenant-dot" [style.background-color]="selectedTenantColor"></span>
                <span class="tenant-name">{{ selectedTenantName }}</span>
                <span class="tenant-arrow">▾</span>
              </button>

              <div class="tenant-dropdown-backdrop" *ngIf="tenantDropdownOpen" (click)="tenantDropdownOpen = false"></div>

              <div class="tenant-dropdown" *ngIf="tenantDropdownOpen">
                <div class="tenant-dropdown-header">Firma / Kurum Değiştir</div>
                
                <div class="tenant-option" [class.active]="!tenantService.currentTenant" (click)="onSelectTenant(null)">
                  <span class="tenant-dot" style="background-color: #8b5cf6;"></span>
                  <div class="tenant-opt-info">
                    <span class="tenant-opt-title">Tüm Havalimanı (İGA / Genel)</span>
                    <span class="tenant-opt-sub">Tüm havayolu ve yer hizmetleri verileri</span>
                  </div>
                  <span class="check-mark" *ngIf="!tenantService.currentTenant">✓</span>
                </div>

                @for (tenant of (tenantService.tenants$ | async); track tenant.id) {
                  <div class="tenant-option" [class.active]="tenantService.currentTenant?.id === tenant.id" (click)="onSelectTenant(tenant)">
                    <span class="tenant-dot" [style.background-color]="tenant.primaryColor"></span>
                    <div class="tenant-opt-info">
                      <span class="tenant-opt-title">{{ tenant.name }} ({{ tenant.code }})</span>
                      <span class="tenant-opt-sub">{{ tenant.type === 'Airline' ? 'Havayolu' : tenant.type === 'GroundHandler' ? 'Yer Hizmetleri' : 'Havalimanı Otoritesi' }}</span>
                    </div>
                    <span class="check-mark" *ngIf="tenantService.currentTenant?.id === tenant.id">✓</span>
                  </div>
                }
              </div>
            </div>

            <!-- WebSocket Baglanti Rozeti -->
            <div class="ws-badge" [class.connected]="(signalrService.isConnected$ | async)" [class.disconnected]="!(signalrService.isConnected$ | async)">
              <span class="ws-dot"></span>
              <span class="ws-text">{{ (signalrService.isConnected$ | async) ? 'Canlı Bağlantı: Aktif' : 'Bağlantı Kesildi' }}</span>
            </div>
            <div class="header-badge">
              <span class="badge badge-info">{{ roleBadge }}</span>
            </div>
          </div>
        </header>

        <!-- Canlı Operasyonel Toast Bildirimleri -->
        <div class="toast-container" *ngIf="activeToasts.length > 0">
          @for (toast of activeToasts; track toast.id) {
            <div class="toast-card" [class]="'toast-' + toast.type" (click)="removeToast(toast.id)">
              <div class="toast-header">
                <span class="toast-icon">
                  {{ toast.type === 'danger' ? '🚨' : toast.type === 'warning' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️' }}
                </span>
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
    }

    .sidebar {
      width: var(--sidebar-width);
      background: #ffffff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
      overflow: hidden;
    }

    .sidebar.collapsed {
      width: 68px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      border-bottom: 1px solid #e5e7eb;
      height: var(--header-height);
      background: #ffffff;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-icon {
      font-size: 1.25rem;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      color: #111827;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      white-space: nowrap;
    }

    .toggle-btn {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #4b5563;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .toggle-btn:hover {
      background: #f9fafb;
      color: #111827;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.75rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: 4px;
      color: #374151;
      font-weight: 500;
      font-size: 0.875rem;
      text-decoration: none;
      white-space: nowrap;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .nav-item.active {
      background: #eff6ff;
      color: #1d4ed8;
      border-left: 3px solid #2563eb;
      font-weight: 600;
    }

    .nav-icon {
      width: 20px;
      text-align: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #e5e7eb;
      background: #fafafa;
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
      border-radius: 50%;
      background: #e2e8f0;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.75rem;
      color: #1e293b;
      flex-shrink: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.8125rem;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .user-role {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #fca5a5;
      color: #dc2626;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .logout-btn:hover {
      background: #fef2f2;
    }

    .main-content {
      margin-left: var(--sidebar-width);
      flex: 1;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    .main-content.expanded {
      margin-left: 68px;
    }

    .top-header {
      height: var(--header-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
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
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
    }

    .tenant-select-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      color: #111827;
      font-size: 0.8125rem;
      font-weight: 500;
      outline: none;
    }

    .tenant-select-box:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .tenant-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tenant-name {
      font-size: 0.8125rem;
      font-weight: 500;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tenant-arrow {
      font-size: 0.75rem;
      color: #6b7280;
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
      width: 300px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 0.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      z-index: 160;
    }

    .tenant-dropdown-header {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #6b7280;
      padding: 0.375rem 0.625rem;
      text-transform: uppercase;
      border-bottom: 1px solid #f1f5f9;
    }

    .tenant-option {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.625rem;
      border-radius: 4px;
      cursor: pointer;
    }

    .tenant-option:hover {
      background: #f3f4f6;
    }

    .tenant-option.active {
      background: #eff6ff;
    }

    .tenant-opt-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      text-align: left;
    }

    .tenant-opt-title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #111827;
    }

    .tenant-opt-sub {
      font-size: 0.6875rem;
      color: #6b7280;
    }

    .check-mark {
      color: #2563eb;
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
      font-weight: 500;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      color: #374151;
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

    .toast-container {
      position: fixed;
      top: 64px;
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
      border-radius: 4px;
      padding: 0.75rem 1rem;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #2563eb;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
      font-weight: 600;
      font-size: 0.8125rem;
      color: #111827;
      flex: 1;
    }

    .toast-time {
      font-size: 0.6875rem;
      color: #6b7280;
    }

    .toast-body {
      font-size: 0.75rem;
      color: #4b5563;
      line-height: 1.4;
    }

    .content-area {
      flex: 1;
      padding: 1.5rem;
      background: #ffffff;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  menuItems: MenuItem[] = [];
  activeToasts: LiveToastNotification[] = [];
  private toastSub?: Subscription;
  tenantDropdownOpen = false;

  constructor(
    public authService: AuthService,
    public signalrService: SignalRService,
    public tenantService: TenantService,
    private router: Router
  ) {
    this.buildMenu();
  }

  get selectedTenantName(): string {
    const tenant = this.tenantService.currentTenant;
    if (!tenant) return 'Tüm Havalimanı (İGA)';
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
    this.toastSub = this.signalrService.toast$.subscribe((toast) => {
      this.activeToasts.push(toast);
      // bildirim 4 saniye sonra kapansin
      setTimeout(() => {
        this.removeToast(toast.id);
      }, 4000);
    });
  }

  ngOnDestroy(): void {
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
    if (url.includes('dashboard')) return 'Operasyon Kontrol Merkezi (OCC)';
    if (url.includes('users')) return 'Kullanıcı Yönetimi';
    if (url.includes('my-tasks')) return 'Görevlerim';
    if (url.includes('inventory')) return 'Yedek Parça Stoğu';
    if (url.includes('maintenance-log')) return 'Bakım Günlüğü';
    if (url.includes('gse-fleet')) return 'Apron Araç & Ekipman Filosu';
    if (url.includes('ramp')) return 'Ramp Saha Görevleri';
    if (url.includes('turnaround')) return 'Uçuş Dönüş Koordinasyonu';
    if (url.includes('gate-agent')) return 'Yolcu Biniş & Kapı Kontrol';
    if (url.includes('loadsheet')) return 'Uçuş Yük ve Denge Formu';
    if (url.includes('checklist')) return 'Uçuş Kontrol Listesi';
    if (url.includes('operations')) return 'Aktif Uçuş Seferleri';
    if (url.includes('fault-reports')) return 'Arıza Bildirimleri';
    if (url.includes('jet-bridges')) return 'Körük ve Park Pozisyonları';
    if (url.includes('my-faults')) return 'Arıza Kayıtlarım';
    if (url.includes('fault-form')) return 'Arıza Bildir';
    return 'AeroPulse Havalimanı Sistemi';
  }

  get roleBadge(): string {
    const role = this.authService.currentUser?.role;
    switch (role) {
      case UserRole.Admin: return 'Sistem Yöneticisi';
      case UserRole.MROEngineer: return 'Teknik Bakım Mühendisi';
      case UserRole.OperationsManager: return 'Operasyon Müdürü';
      case UserRole.FieldTechnician: return 'Saha / Ramp Teknisyeni';
      case UserRole.Viewer: return 'İzleyici';
      default: return role || '';
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
          { label: 'Genel Bakış', icon: '📊', route: '/admin/dashboard' },
          { label: 'Kullanıcılar', icon: '👥', route: '/admin/users' },
          { label: 'Uçuş Radarı', icon: '🛫', route: '/ops/dashboard' },
          { label: 'Uçuş Seferleri', icon: '✈️', route: '/ops/operations' },
          { label: 'Apron Filosu', icon: '🚜', route: '/ops/gse-fleet' },
          { label: 'Ramp Görevleri', icon: '📋', route: '/ops/ramp' },
          { label: 'Körük ve Kapı', icon: '🔗', route: '/ops/jet-bridges' },
          { label: 'Arıza Raporları', icon: '⚠️', route: '/ops/fault-reports' },
          { label: 'Mühendislik (MRO)', icon: '⚙️', route: '/mro/dashboard' },
          { label: 'İzleyici Paneli', icon: '👁️', route: '/viewer/dashboard' }
        ];
        break;
      case UserRole.MROEngineer:
        this.menuItems = [
          { label: 'Mühendislik Paneli', icon: '📊', route: '/mro/dashboard' },
          { label: 'Görevlerim', icon: '📋', route: '/mro/my-tasks' },
          { label: 'Yedek Parça Stoğu', icon: '⚙️', route: '/mro/inventory' },
          { label: 'Bakım Günlüğü', icon: '📝', route: '/mro/maintenance-log' },
          { label: 'Arıza Raporları', icon: '⚠️', route: '/ops/fault-reports' },
          { label: 'Körük Durumu', icon: '🔗', route: '/ops/jet-bridges' }
        ];
        break;
      case UserRole.OperationsManager:
        this.menuItems = [
          { label: 'Uçuş Radarı', icon: '🛫', route: '/ops/dashboard' },
          { label: 'Uçuş Seferleri', icon: '✈️', route: '/ops/operations' },
          { label: 'Apron Filosu', icon: '🚜', route: '/ops/gse-fleet' },
          { label: 'Saha Görevleri', icon: '📋', route: '/ops/ramp' },
          { label: 'Körük Durumu', icon: '🔗', route: '/ops/jet-bridges' },
          { label: 'Arıza Raporları', icon: '⚠️', route: '/ops/fault-reports' },
          { label: 'Mühendislik Durumu', icon: '⚙️', route: '/mro/dashboard' }
        ];
        break;
      case UserRole.FieldTechnician:
        this.menuItems = [
          { label: 'Ramp İş Emirleri', icon: '📋', route: '/tech/ramp-tasks' },
          { label: 'Apron Araçları', icon: '🚜', route: '/tech/gse-fleet' },
          { label: 'Arıza Kayıtlarım', icon: '🛠️', route: '/tech/my-faults' },
          { label: 'Arıza Bildir', icon: '⚠️', route: '/tech/fault-form' },
          { label: 'Körük Durumu', icon: '🔗', route: '/ops/jet-bridges' }
        ];
        break;
      case UserRole.Viewer:
        this.menuItems = [
          { label: 'İzleyici Paneli', icon: '📊', route: '/viewer/dashboard' },
          { label: 'Uçuş Seferleri', icon: '✈️', route: '/ops/operations' },
          { label: 'Körük Durumu', icon: '🔗', route: '/ops/jet-bridges' },
          { label: 'Apron Filosu', icon: '🚜', route: '/ops/gse-fleet' }
        ];
        break;
    }
  }
}
