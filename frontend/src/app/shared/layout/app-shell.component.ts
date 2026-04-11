import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core';
import { BUSINESS_NAV_ITEMS } from '../navigation/business-navigation';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <header class="shell-header">
        <a routerLink="/dashboard" class="brand" (click)="closeMenu()">
          <span class="brand-mark">P2000</span>
          <span>
            <strong>Prospect 2000</strong>
            <small>Navigation metier</small>
          </span>
        </a>

        <button
          type="button"
          class="menu-toggle"
          (click)="toggleMenu()"
          [attr.aria-expanded]="menuOpen()"
          aria-label="Ouvrir la navigation"
        >
          Menu
        </button>

        <div class="shell-actions desktop-only">
          @if (userLabel(); as userLabel) {
            <span class="user-chip">{{ userLabel }}</span>
          }
          <button type="button" class="logout-button" (click)="logout()">Se deconnecter</button>
        </div>
      </header>

      <div class="shell-body">
        <aside class="shell-nav" [class.open]="menuOpen()">
          <nav>
            <p class="nav-title">Modules</p>
            <a
              *ngFor="let item of navItems"
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="closeMenu()"
            >
              <span class="nav-label">{{ item.label }}</span>
              <span class="nav-description">{{ item.description }}</span>
            </a>
          </nav>

          <div class="mobile-only mobile-actions">
            @if (userLabel(); as userLabel) {
              <span class="user-chip">{{ userLabel }}</span>
            }
            <button type="button" class="logout-button" (click)="logout()">Se deconnecter</button>
          </div>
        </aside>

        <main class="shell-content" (click)="closeMenu()">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: linear-gradient(180deg, #f7f2ea 0%, #eef3f7 100%);
        color: #18202a;
      }

      .shell-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        background: rgba(247, 242, 234, 0.92);
        position: sticky;
        top: 0;
        z-index: 20;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.85rem;
        color: inherit;
        text-decoration: none;
      }

      .brand small {
        display: block;
      }

      .brand-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        background: #18202a;
        color: #f7f2ea;
        font-weight: 700;
      }

      .menu-toggle,
      .logout-button {
        border: none;
        cursor: pointer;
        font: inherit;
      }

      .menu-toggle {
        display: none;
        padding: 0.75rem 1rem;
        background: #18202a;
        color: #f7f2ea;
      }

      .shell-actions,
      .mobile-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .user-chip {
        display: inline-flex;
        align-items: center;
        padding: 0 0.9rem;
        border-radius: 999px;
        background: #ffffff;
        color: #51606f;
      }

      .logout-button {
        padding: 0 1rem;
        border-radius: 999px;
        background: #d7a648;
        color: #18202a;
        font-weight: 600;
      }

      .shell-body {
        display: grid;
        grid-template-columns: 18rem minmax(0, 1fr);
        padding: 1.25rem;
      }

      .shell-nav {
        padding: 1rem;
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid #d7dee5;
        position: sticky;
        top: 5.5rem;
      }

      .nav-title {
        margin: 0 0 0.9rem;
        text-transform: uppercase;
        font-size: 0.75rem;
        font-weight: 700;
        color: #8a6a2f;
      }

      nav {
        display: grid;
        gap: 0.65rem;
      }

      nav a {
        display: block;
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        text-decoration: none;
        color: inherit;
        border: 1px solid transparent;
      }

      nav a:hover,
      nav a.active {
        border-color: #b7c4d1;
      }

      .nav-label,
      .nav-description {
        display: block;
      }

      .nav-label {
        font-weight: 700;
      }

      .nav-description {
        color: #607081;
        line-height: 1.45;
      }

      .shell-content {
        padding: 1.5rem;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid #d7dee5;
      }

      .mobile-only {
        display: none;
      }

      @media (max-width: 960px) {
        .menu-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .desktop-only {
          display: none;
        }

        .mobile-only {
          display: flex;
        }

        .shell-body {
          grid-template-columns: 1fr;
        }

        .shell-nav {
          display: none;
          position: static;
          top: auto;
        }

        .shell-nav.open {
          display: block;
        }

        .shell-content {
          padding: 1.1rem;
        }
      }
    `
  ]
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly navItems = BUSINESS_NAV_ITEMS;
  readonly menuOpen = signal(false);
  readonly userLabel = computed(() => {
    const user = this.authService.currentUser();

    if (!user) {
      return null;
    }

    return `${user.email} · ${user.role}`;
  });

  toggleMenu(): void {
    this.menuOpen.update(isOpen => !isOpen);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/auth/login']);
  }
}