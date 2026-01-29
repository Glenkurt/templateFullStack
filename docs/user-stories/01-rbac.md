# User Story 1 : RBAC (Rôles et Permissions)

## Contexte

L'auth JWT est déjà en place avec `ApplicationUser` et `RefreshToken`. Le frontend utilise des guards fonctionnels (`authGuard`). On veut ajouter un système de rôles pour distinguer Admin, User, et Owner.

## Objectif

Implémenter un système de rôles avec vérification côté backend (attributs/policies) et frontend (guards + UI conditionnelle).

## Base de données

Modifier l'entité existante `ApplicationUser` dans `api/Api/Models/Entities/ApplicationUser.cs` :

```csharp
public class ApplicationUser
{
    // ... propriétés existantes (Id, Email, PasswordHash, etc.) ...

    // AJOUTER cette propriété
    public string Role { get; set; } = "User"; // Valeurs possibles : "User", "Admin", "Owner"
}
```

Créer une migration EF Core pour ajouter la colonne `Role` avec valeur par défaut "User".

## Backend — Modifications à effectuer

### 1. Ajouter le rôle dans le JWT

Modifier `api/Api/Services/AuthService.cs` dans la méthode de génération du token JWT.

Ajouter le claim Role dans la liste des claims :

```csharp
var claims = new List<Claim>
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
    new Claim(ClaimTypes.Email, user.Email),
    new Claim(ClaimTypes.Role, user.Role) // AJOUTER cette ligne
};
```

### 2. Configurer les policies d'autorisation

Modifier `api/Api/Program.cs` ou `api/Api/Extensions/ServiceCollectionExtensions.cs` :

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "Owner"));
    options.AddPolicy("OwnerOnly", policy => policy.RequireRole("Owner"));
});
```

### 3. Créer le contrôleur Admin

Créer le fichier `api/Api/Controllers/AdminController.cs` :

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>
    /// Récupère la liste de tous les utilisateurs (Admin uniquement)
    /// </summary>
    [HttpGet("users")]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        var users = await _adminService.GetAllUsersAsync();
        return Ok(users);
    }

    /// <summary>
    /// Met à jour le rôle d'un utilisateur (Admin uniquement)
    /// </summary>
    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid userId, [FromBody] UpdateRoleRequest request)
    {
        var validRoles = new[] { "User", "Admin", "Owner" };
        if (!validRoles.Contains(request.Role))
        {
            return BadRequest(new { error = "Invalid role. Must be User, Admin, or Owner." });
        }

        var success = await _adminService.UpdateUserRoleAsync(userId, request.Role);
        if (!success)
        {
            return NotFound(new { error = "User not found" });
        }

        return NoContent();
    }

    /// <summary>
    /// Récupère les statistiques globales (Admin uniquement)
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> GetStats()
    {
        var stats = await _adminService.GetStatsAsync();
        return Ok(stats);
    }
}
```

### 4. Créer le service Admin

Créer l'interface `api/Api/Services/IAdminService.cs` :

```csharp
namespace Api.Services;

public interface IAdminService
{
    Task<List<UserDto>> GetAllUsersAsync();
    Task<bool> UpdateUserRoleAsync(Guid userId, string role);
    Task<AdminStatsDto> GetStatsAsync();
}
```

Créer l'implémentation `api/Api/Services/AdminService.cs` :

```csharp
using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models.DTOs;

namespace Api.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .Select(u => new UserDto(
                u.Id,
                u.Email,
                u.Role,
                u.CreatedAt
            ))
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> UpdateUserRoleAsync(Guid userId, string role)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.Role = role;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AdminStatsDto> GetStatsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var usersByRole = await _context.Users
            .GroupBy(u => u.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Role, x => x.Count);

        var recentSignups = await _context.Users
            .Where(u => u.CreatedAt >= DateTime.UtcNow.AddDays(-7))
            .CountAsync();

        return new AdminStatsDto(
            totalUsers,
            usersByRole,
            recentSignups
        );
    }
}
```

### 5. Créer les DTOs

Créer le fichier `api/Api/Models/DTOs/Admin/AdminDtos.cs` :

```csharp
namespace Api.Models.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string Role,
    DateTime CreatedAt
);

public record UpdateRoleRequest(string Role);

public record AdminStatsDto(
    int TotalUsers,
    Dictionary<string, int> UsersByRole,
    int RecentSignups
);
```

### 6. Modifier le DTO existant pour /auth/me

Mettre à jour le endpoint `GET /api/v1/auth/me` pour inclure le rôle dans la réponse.

Si le DTO `UserInfoDto` existe, le modifier pour inclure :

```csharp
public record UserInfoDto(Guid Id, string Email, string Role);
```

### 7. Enregistrer le service

Dans `api/Api/Extensions/ServiceCollectionExtensions.cs`, ajouter :

```csharp
services.AddScoped<IAdminService, AdminService>();
```

## Frontend — Modifications à effectuer

### 1. Mettre à jour le modèle User

Créer ou modifier `frontend/src/app/core/models/user.model.ts` :

```typescript
export interface User {
  id: string;
  email: string;
  role: 'User' | 'Admin' | 'Owner';
}
```

### 2. Mettre à jour AuthService

Modifier `frontend/src/app/core/services/auth.service.ts` :

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ... code existant ...

  // Signal pour l'utilisateur courant (modifier si déjà existant)
  currentUser = signal<User | null>(null);

  // Computed pour vérifier les rôles
  isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.role === 'Admin' || user?.role === 'Owner';
  });

  isOwner = computed(() => {
    const user = this.currentUser();
    return user?.role === 'Owner';
  });

  userRole = computed(() => this.currentUser()?.role ?? null);

  // ... reste du code existant ...
}
```

### 3. Créer le guard admin

Créer `frontend/src/app/core/guards/admin.guard.ts` :

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
```

### 4. Créer la directive HasRole

Créer `frontend/src/app/shared/directives/has-role.directive.ts` :

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  private hasView = false;
  private requiredRoles: string[] = [];

  @Input() set appHasRole(roles: string | string[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  constructor() {
    effect(() => {
      // Re-evaluate when user changes
      this.authService.currentUser();
      this.updateView();
    });
  }

  private updateView(): void {
    const userRole = this.authService.userRole();
    const hasRole = userRole ? this.requiredRoles.includes(userRole) : false;

    if (hasRole && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasRole && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
```

### 5. Créer le service Admin

Créer `frontend/src/app/services/admin.service.ts` :

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDto {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  recentSignups: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin`;

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: string, role: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }
}
```

### 6. Créer la page Admin

Créer le dossier `frontend/src/app/features/admin/` avec les fichiers :

**admin.component.ts** :

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, UserDto, AdminStats } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
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
      error: (err) => this.error.set('Failed to load stats')
    });

    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
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
      error: (err) => this.error.set('Failed to update role')
    });
  }
}
```

**admin.component.html** :

```html
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
      @for (entry of s.usersByRole | keyvalue; track entry.key) {
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
```

**admin.component.scss** :

```scss
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
```

### 7. Ajouter les routes

Modifier `frontend/src/app/app.routes.ts` pour ajouter :

```typescript
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // ... routes existantes ...

  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  }
];
```

## Tests à ajouter

Créer `api/Api.Tests/Integration/AdminEndpointTests.cs` :

```csharp
[Fact]
public async Task GetUsers_AsAdmin_ReturnsOk()
{
    // Arrange: créer un user admin et obtenir son token
    // Act: appeler GET /api/v1/admin/users
    // Assert: status 200
}

[Fact]
public async Task GetUsers_AsUser_ReturnsForbidden()
{
    // Arrange: créer un user normal et obtenir son token
    // Act: appeler GET /api/v1/admin/users
    // Assert: status 403
}

[Fact]
public async Task UpdateUserRole_AsAdmin_ReturnsNoContent()
{
    // Arrange: créer un admin et un user cible
    // Act: PATCH /api/v1/admin/users/{id}/role avec {"role": "Admin"}
    // Assert: status 204, le rôle a changé en DB
}
```

## Critères de validation

- [ ] Le JWT contient le claim `role`
- [ ] `GET /api/v1/auth/me` retourne le rôle de l'utilisateur
- [ ] Les endpoints `/api/v1/admin/*` retournent 403 pour les Users normaux
- [ ] Les endpoints `/api/v1/admin/*` fonctionnent pour Admin et Owner
- [ ] Le frontend affiche/masque les éléments selon le rôle via `*appHasRole`
- [ ] Le guard `adminGuard` redirige les non-admins vers `/unauthorized`
- [ ] La page Admin affiche la liste des users et les stats
- [ ] Un Admin peut changer le rôle d'un user via le dropdown
