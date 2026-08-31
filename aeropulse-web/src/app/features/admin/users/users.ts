import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { User, UserRole, RegisterRequest } from '../../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>User Management</h1>
        <p class="subtitle">Manage system users and their roles</p>
      </div>
      <button class="btn btn-primary" (click)="showAddModal = true">+ Add User</button>
    </div>

    <!-- Users Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden;">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (user of users; track user.id) {
            <tr>
              <td>
                <div class="user-cell">
                  <div class="user-avatar-sm">{{ getInitials(user.fullName) }}</div>
                  <span>{{ user.fullName }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td><span class="badge" [class]="getRoleBadge(user.role)">{{ user.roleName }}</span></td>
              <td>
                <span class="badge" [class]="user.isActive ? 'badge-success' : 'badge-danger'">
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>{{ user.createdAt | date:'mediumDate' }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" (click)="editUser(user)">Edit</button>
                  <button class="btn btn-sm btn-danger" (click)="deactivateUser(user)" *ngIf="user.isActive">
                    Deactivate
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Add User Modal -->
    <div class="modal-backdrop" *ngIf="showAddModal" (click)="showAddModal = false">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editingUser ? 'Edit User' : 'Add New User' }}</h2>
          <button class="modal-close" (click)="closeModal()">&times;</button>
        </div>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Full Name</label>
            <input class="form-control" [(ngModel)]="formData.fullName" name="fullName" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-control" [(ngModel)]="formData.email" name="email" required />
          </div>
          <div class="form-group" *ngIf="!editingUser">
            <label>Password</label>
            <input type="password" class="form-control" [(ngModel)]="formData.password" name="password" required />
          </div>
          <div class="form-group">
            <label>Role</label>
            <select class="form-control" [(ngModel)]="formData.role" name="role">
              <option value="Admin">Admin</option>
              <option value="OperationsManager">Operations Manager</option>
              <option value="MROEngineer">MRO Engineer</option>
              <option value="FieldTechnician">Field Technician</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div class="error-message" *ngIf="errorMessage" style="margin-top: 0.5rem;">
            ⚠️ {{ errorMessage }}
          </div>
          <div class="flex gap-2 mt-2" style="justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving">
              {{ saving ? 'Saving...' : (editingUser ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.7rem;
      color: #fff;
      flex-shrink: 0;
    }

    .action-btns {
      display: flex;
      gap: 0.5rem;
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--border-radius-sm);
      padding: 0.5rem 0.75rem;
      color: var(--color-danger);
      font-size: 0.875rem;
    }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  showAddModal = false;
  editingUser: User | null = null;
  saving = false;
  errorMessage = '';
  formData = { fullName: '', email: '', password: '', role: 'MROEngineer' as string };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.authService.getAllUsers().subscribe(res => {
      if (res.success) this.users = res.data;
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getRoleBadge(role: string): string {
    switch (role) {
      case 'Admin': return 'badge-critical';
      case 'MROEngineer': return 'badge-info';
      case 'OperationsManager': return 'badge-warning';
      case 'FieldTechnician': return 'badge-success';
      case 'Viewer': return 'badge-default';
      default: return 'badge-default';
    }
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.formData = { fullName: user.fullName, email: user.email, password: '', role: user.role };
    this.showAddModal = true;
    this.errorMessage = '';
  }

  deactivateUser(user: User): void {
    if (confirm(`Deactivate ${user.fullName}?`)) {
      this.authService.deactivateUser(user.id).subscribe(res => {
        if (res.success) this.loadUsers();
      });
    }
  }

  closeModal(): void {
    this.showAddModal = false;
    this.editingUser = null;
    this.formData = { fullName: '', email: '', password: '', role: 'MROEngineer' };
    this.errorMessage = '';
  }

  onSubmit(): void {
    this.saving = true;
    this.errorMessage = '';

    if (this.editingUser) {
      this.authService.updateUser(this.editingUser.id, {
        fullName: this.formData.fullName,
        email: this.formData.email,
        role: this.formData.role as UserRole
      }).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.success) { this.closeModal(); this.loadUsers(); }
          else this.errorMessage = res.message;
        },
        error: (err) => { this.saving = false; this.errorMessage = err.error?.message || 'Error'; }
      });
    } else {
      this.authService.register({
        fullName: this.formData.fullName,
        email: this.formData.email,
        password: this.formData.password,
        role: this.formData.role as UserRole
      }).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.success) { this.closeModal(); this.loadUsers(); }
          else this.errorMessage = res.message;
        },
        error: (err) => { this.saving = false; this.errorMessage = err.error?.message || 'Error'; }
      });
    }
  }
}
