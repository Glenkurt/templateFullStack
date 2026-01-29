import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, UserDto, AdminStats } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-container">
      <h1>Admin Dashboard</h1>

      @if (loading()) {
        <p>Loading...</p>
      }

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (stats(); as s) {
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Users</h3>
            <p class="stat-value">{{ s.totalUsers }}</p>
          </div>
          <div class="stat-card">
            <h3>Recent Signups (7 days)</h3>
            <p class="stat-value">{{ s.recentSignups }}</p>
          </div>
          @for (entry of getEntries(s.usersByRole); track entry.key) {
            <div class="stat-card">
              <h3>{{ entry.key }}s</h3>
              <p class="stat-value">{{ entry.value }}</p>
            </div>
          }
        </div>
      }

      <h2>Users</h2>
      <table class="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr>
              <td>{{ user.email }}</td>
              <td>{{ user.role }}</td>
              <td>{{ user.createdAt | date:'short' }}</td>
              <td>
                <select [value]="user.role" (change)="changeRole(user.id, $any($event.target).value)">
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                </select>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .admin-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #f5f5f5;
      padding: 1.5rem;
      border-radius: 8px;

      h3 {
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
        color: #666;
      }

      .stat-value {
        margin: 0;
        font-size: 2rem;
        font-weight: bold;
      }
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #eee;
      }

      th {
        background: #f5f5f5;
        font-weight: 600;
      }

      select {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
    }

    .error {
      background: #fee;
      color: #c00;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
  `]
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<UserDto[]>([]);
  stats = signal<AdminStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.error.set('Failed to load stats')
    });

    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load users');
        this.loading.set(false);
      }
    });
  }

  changeRole(userId: string, newRole: string): void {
    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: () => {
        this.users.update(users =>
          users.map(u => u.id === userId ? { ...u, role: newRole } : u)
        );
      },
      error: () => this.error.set('Failed to update role')
    });
  }

  getEntries(obj: Record<string, number>): { key: string; value: number }[] {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }
}
