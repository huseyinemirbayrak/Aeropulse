import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserRole } from '../../core/models';

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
            <div class="header-badge">
              <span class="badge badge-info">{{ roleBadge }}</span>
            </div>
          </div>
        </header>
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

    .content-area {
      flex: 1;
      padding: 2rem;
      animation: fadeIn 0.3s ease;
    }
  `]
})
export class LayoutComponent {
  sidebarCollapsed = false;
  menuItems: MenuItem[] = [];

  constructor(public authService: AuthService, private router: Router) {
    this.buildMenu();
  }

  get userInitials(): string {
    const name = this.authService.currentUser?.fullName || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get pageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Dashboard';
    if (url.includes('users')) return 'User Management';
    if (url.includes('my-tasks')) return 'My Tasks';
    if (url.includes('inventory')) return 'Parts Inventory';
    if (url.includes('maintenance-log')) return 'Maintenance Log';
    if (url.includes('operations')) return 'Operations';
    if (url.includes('checklist')) return 'Operation Checklist';
    if (url.includes('fault-reports')) return 'Fault Reports';
    if (url.includes('jet-bridges')) return 'Jet Bridges Map';
    if (url.includes('my-faults')) return 'My Faults';
    if (url.includes('fault-form')) return 'Report Fault';
    return 'AeroPulse';
  }

  get roleBadge(): string {
    const role = this.authService.currentUser?.role;
    switch (role) {
      case UserRole.Admin: return '🔑 Administrator';
      case UserRole.MROEngineer: return '🔧 MRO Engineer';
      case UserRole.OperationsManager: return '🛫 Operations Manager';
      case UserRole.FieldTechnician: return '🛠️ Field Technician';
      case UserRole.Viewer: return '📊 Board Viewer';
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
          { label: 'Dashboard', icon: '📊', route: '/admin/dashboard' },
          { label: 'User Management', icon: '👥', route: '/admin/users' },
          { label: 'Ops Dashboard', icon: '🛫', route: '/ops/dashboard' },
          { label: 'Tech Panel', icon: '🛠️', route: '/tech/my-faults' }
        ];
        break;
      case UserRole.MROEngineer:
        this.menuItems = [
          { label: 'Dashboard', icon: '📊', route: '/mro/dashboard' },
          { label: 'My Tasks', icon: '📋', route: '/mro/my-tasks' },
          { label: 'Parts Inventory', icon: '⚙️', route: '/mro/inventory' },
          { label: 'Maintenance Log', icon: '📝', route: '/mro/maintenance-log' },
        ];
        break;
      case UserRole.OperationsManager:
        this.menuItems = [
          { label: 'Dashboard', icon: '📊', route: '/ops/dashboard' },
          { label: 'Operations', icon: '🛫', route: '/ops/operations' },
          { label: 'Fault Reports', icon: '⚠️', route: '/ops/fault-reports' },
          { label: 'Jet Bridges', icon: '🔗', route: '/ops/jet-bridges' },
        ];
        break;
      case UserRole.FieldTechnician:
        this.menuItems = [
          { label: 'My Faults', icon: '📋', route: '/tech/my-faults' },
          { label: 'Report Fault', icon: '⚠️', route: '/tech/fault-form' },
        ];
        break;
      case UserRole.Viewer:
        this.menuItems = [
          { label: 'Dashboard', icon: '📊', route: '/viewer/dashboard' },
        ];
        break;
    }
  }
}
