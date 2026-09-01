import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login-material').then(m => m.LoginComponent)
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./shared/forbidden/forbidden').then(m => m.ForbiddenComponent)
  },
  {
    path: 'admin',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./shared/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/dashboard-material').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./features/admin/users/users').then(m => m.UsersComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'mro',
    canActivate: [roleGuard('MROEngineer')],
    loadComponent: () => import('./shared/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/mro/dashboard/dashboard').then(m => m.MRODashboardComponent) },
      { path: 'my-tasks', loadComponent: () => import('./features/mro/my-tasks/my-tasks').then(m => m.MyTasksComponent) },
      { path: 'inventory', loadComponent: () => import('./features/mro/inventory/inventory').then(m => m.InventoryComponent) },
      { path: 'maintenance-log', loadComponent: () => import('./features/mro/maintenance-log/maintenance-log').then(m => m.MaintenanceLogComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'viewer',
    canActivate: [roleGuard('Viewer', 'Admin')],
    loadComponent: () => import('./shared/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/viewer/dashboard/dashboard').then(m => m.ViewerDashboardComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'ops',
    canActivate: [roleGuard('OperationsManager', 'Admin')],
    loadComponent: () => import('./shared/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/ops/dashboard/dashboard').then(m => m.OpsDashboardComponent) },
      { path: 'operations', loadComponent: () => import('./features/ops/operations/operations').then(m => m.OperationsComponent) },
      { path: 'checklist/:id', loadComponent: () => import('./features/ops/checklist/checklist').then(m => m.ChecklistComponent) },
      { path: 'fault-reports', loadComponent: () => import('./features/ops/fault-reports/fault-reports').then(m => m.FaultReportsComponent) },
      { path: 'jet-bridges', loadComponent: () => import('./features/ops/jet-bridges/jet-bridges').then(m => m.JetBridgesComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'tech',
    canActivate: [roleGuard('FieldTechnician', 'Admin')],
    loadComponent: () => import('./shared/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: 'my-faults', loadComponent: () => import('./features/tech/my-faults/my-faults').then(m => m.MyFaultsComponent) },
      { path: 'fault-form', loadComponent: () => import('./features/tech/fault-form/fault-form').then(m => m.FaultFormComponent) },
      { path: '', redirectTo: 'my-faults', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
