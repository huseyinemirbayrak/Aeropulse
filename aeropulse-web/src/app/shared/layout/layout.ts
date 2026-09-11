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
              <span class="tenant-label">Kurum:</span>
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
    }

    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-normal);
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
      padding: 1.25rem 1rem;
      border-bottom: 1px solid var(--border-color);
      min-height: 64px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      font-size: 1.5rem;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-gradient);
      border-radius: 10px;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
    }

    .toggle-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem;
      transition: color var(--transition-fast);
    }

    .toggle-btn:hover {
      color: var(--accent-primary);
    }

    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--border-radius-sm);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
      text-decoration: none;
      white-space: nowrap;
    }

    .nav-item:hover {
      background: rgba(0, 212, 255, 0.08);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: rgba(0, 212, 255, 0.12);
      color: var(--accent-primary);
      box-shadow: inset 3px 0 0 var(--accent-primary);
    }

    .nav-icon {
      width: 20px;
      text-align: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
      color: #fff;
      flex-shrink: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }

    .user-role {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border-radius: var(--border-radius-sm);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: var(--color-danger);
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all var(--transition-fast);
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .main-content {
      margin-left: var(--sidebar-width);
      flex: 1;
      transition: margin-left var(--transition-normal);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content.expanded {
      margin-left: 68px;
    }

    .top-header {
      height: var(--header-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(20px);
    }

    .page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .tenant-switcher-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tenant-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .tenant-select-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 0.35rem 0.85rem;
      cursor: pointer;
      color: var(--text-primary);
      font-family: inherit;
      transition: all 0.2s ease;
      outline: none;
    }

    .tenant-select-box:hover {
      background: rgba(30, 41, 59, 0.95);
      border-color: rgba(56, 189, 248, 0.5);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
    }

    .tenant-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 8px currentColor;
    }

    .tenant-name {
      font-size: 0.82rem;
      font-weight: 600;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tenant-arrow {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-left: 0.2rem;
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
      top: calc(100% + 8px);
      right: 0;
      width: 330px;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 0.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(20px);
      z-index: 160;
      animation: slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDownFade {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .tenant-dropdown-header {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      padding: 0.4rem 0.75rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 0.35rem;
    }

    .tenant-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tenant-option:hover {
      background: rgba(56, 189, 248, 0.12);
    }

    .tenant-option.active {
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.35);
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
      color: #f1f5f9;
    }

    .tenant-opt-sub {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .check-mark {
      color: #38bdf8;
      font-weight: 800;
      font-size: 0.9rem;
    }

    .ws-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      transition: all 0.3s ease;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .ws-badge.connected {
      border-color: rgba(34, 197, 94, 0.4);
      background: rgba(34, 197, 94, 0.12);
      color: #4ade80;
      box-shadow: 0 0 15px rgba(34, 197, 94, 0.2);
    }

    .ws-badge.disconnected {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
    }

    .ws-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    .toast-container {
      position: fixed;
      top: 75px;
      right: 25px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      pointer-events: none;
    }

    .toast-card {
      pointer-events: auto;
      cursor: pointer;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      border-left: 4px solid #38bdf8;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45);
      animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .toast-card:hover {
      transform: translateY(-2px);
    }

    .toast-card.toast-info {
      border-left-color: #38bdf8;
      border-right: 1px solid rgba(56, 189, 248, 0.2);
    }

    .toast-card.toast-success {
      border-left-color: #22c55e;
      border-right: 1px solid rgba(34, 197, 94, 0.2);
    }

    .toast-card.toast-warning {
      border-left-color: #f59e0b;
      border-right: 1px solid rgba(245, 158, 11, 0.2);
    }

    .toast-card.toast-danger {
      border-left-color: #ef4444;
      border-right: 1px solid rgba(239, 68, 68, 0.2);
    }

    .toast-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .toast-icon {
      font-size: 1.1rem;
    }

    .toast-title {
      font-weight: 700;
      font-size: 0.875rem;
      color: #f8fafc;
      flex: 1;
    }

    .toast-time {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .toast-body {
      font-size: 0.8125rem;
      color: #cbd5e1;
      line-height: 1.4;
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(50px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .content-area {
      flex: 1;
      padding: 2rem;
      animation: fadeIn 0.3s ease;
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
          { label: 'Apron Filosu', icon: '🚜', route: '/ops/gse-fleet' },
          { label: 'Ramp Görevleri', icon: '📋', route: '/ops/ramp' },
          { label: 'Teknik Servis', icon: '🛠️', route: '/tech/ramp-tasks' }
        ];
        break;
      case UserRole.MROEngineer:
        this.menuItems = [
          { label: 'Genel Bakış', icon: '📊', route: '/mro/dashboard' },
          { label: 'Görevlerim', icon: '📋', route: '/mro/my-tasks' },
          { label: 'Parça Stoğu', icon: '⚙️', route: '/mro/inventory' },
          { label: 'Bakım Kayıtları', icon: '📝', route: '/mro/maintenance-log' },
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
        ];
        break;
      case UserRole.FieldTechnician:
        this.menuItems = [
          { label: 'İş Emirleri', icon: '📋', route: '/tech/ramp-tasks' },
          { label: 'Apron Araçları', icon: '🚜', route: '/tech/gse-fleet' },
          { label: 'Arıza Kayıtlarım', icon: '🛠️', route: '/tech/my-faults' },
          { label: 'Arıza Bildir', icon: '⚠️', route: '/tech/fault-form' },
        ];
        break;
      case UserRole.Viewer:
        this.menuItems = [
          { label: 'Genel Bakış', icon: '📊', route: '/viewer/dashboard' },
        ];
        break;
    }
  }
}
