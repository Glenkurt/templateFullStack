import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  DashboardOverviewDto,
  DashboardService,
  MonthlyFinancePointDto,
  RecentClientDto
} from '../../services/dashboard.service';
import { CampaignStatus } from '../../services/domain.models';

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const compactCurrencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1
});

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'short'
});

type ChartCoordinate = {
  id: string;
  label: string;
  revenue: number;
  expense: number;
  x: number;
  revenueY: number;
  expenseY: number;
};

type ChartTick = {
  value: number;
  y: number;
};

type ChartModel = {
  hasData: boolean;
  maxValue: number;
  revenuePath: string;
  expensePath: string;
  coordinates: ChartCoordinate[];
  ticks: ChartTick[];
};

function toMonthDate(point: MonthlyFinancePointDto): Date {
  return new Date(point.year, point.month - 1, 1);
}

function buildLinePath(coordinates: ChartCoordinate[], key: 'revenueY' | 'expenseY'): string {
  return coordinates
    .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x} ${coordinate[key]}`)
    .join(' ');
}

function formatOverviewError(error: unknown): string {
  const maybeError = error as { message?: string; error?: { detail?: string; title?: string } } | null;
  return maybeError?.error?.detail ?? maybeError?.error?.title ?? maybeError?.message ?? 'Le dashboard ne peut pas etre charge pour le moment.';
}

/**
 * Dashboard feature component.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Prospect 2000</p>
        <h1>Dashboard metier</h1>
        <p class="intro">
          Vue de pilotage consolidee sur les revenus, depenses, clients et campagnes actives.
        </p>
      </div>
      <div class="header-actions">
        <div class="status-pill">
          {{ summary().activeCampaigns }} campagne{{ summary().activeCampaigns > 1 ? 's' : '' }}
          active{{ summary().activeCampaigns > 1 ? 's' : '' }}
        </div>
        <button
          type="button"
          class="primary-link"
          (click)="refreshOverview()"
          [disabled]="isLoading() || isRefreshing()"
        >
          {{ isRefreshing() ? 'Actualisation...' : 'Actualiser le dashboard' }}
        </button>
      </div>
    </section>

    @if (errorMessage(); as errorMessage) {
      <section class="banner">
        <div>
          <strong>{{ overview() ? 'Derniere actualisation echouee' : 'Chargement impossible' }}</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <button
          type="button"
          class="ghost-button"
          (click)="refreshOverview()"
          [disabled]="isLoading() || isRefreshing()"
        >
          Reessayer
        </button>
      </section>
    }

    @if (isLoading() && !overview()) {
      <section class="state-card">
        <strong>Chargement du dashboard...</strong>
        <p>Recuperation des indicateurs, tendances mensuelles et listes metier.</p>
      </section>
    } @else {
      <section class="stats-grid">
        <article class="stat-card accent">
          <span class="stat-label">Total revenus</span>
          <span class="stat-value">{{ formatCurrency(summary().totalRevenue) }}</span>
          <span class="stat-meta">Encaissements cumules a date</span>
        </article>

        <article class="stat-card">
          <span class="stat-label">Total depenses</span>
          <span class="stat-value">{{ formatCurrency(summary().totalExpense) }}</span>
          <span class="stat-meta">Sorties de tresorerie cumulees</span>
        </article>

        <article class="stat-card" [class.negative]="summary().netProfit < 0">
          <span class="stat-label">Benefice net</span>
          <span class="stat-value">{{ formatCurrency(summary().netProfit) }}</span>
          <span class="stat-meta">
            {{ summary().netProfit >= 0 ? 'Marge positive actuelle' : 'Depenses superieures aux revenus' }}
          </span>
        </article>

        <article class="stat-card">
          <span class="stat-label">Clients</span>
          <span class="stat-value">{{ summary().totalClients }}</span>
          <span class="stat-meta">Comptes actifs dans le portefeuille</span>
        </article>
      </section>

      <section class="overview-grid">
        <article class="panel chart-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Tendance mensuelle</p>
              <h2>Revenus vs depenses</h2>
            </div>
            <div class="legend" aria-label="Legende du graphique">
              <span><i class="legend-swatch revenue"></i> Revenus</span>
              <span><i class="legend-swatch expense"></i> Depenses</span>
            </div>
          </div>

          @if (chartModel().hasData) {
            <div class="chart-shell">
              <svg viewBox="0 0 640 260" class="trend-chart" aria-label="Evolution mensuelle des revenus et depenses">
                @for (tick of chartModel().ticks; track tick.value) {
                  <line x1="28" [attr.y1]="tick.y" x2="612" [attr.y2]="tick.y" class="chart-grid-line" />
                  <text x="16" [attr.y]="tick.y + 4" class="chart-axis-label">{{ formatCompactCurrency(tick.value) }}</text>
                }

                <path [attr.d]="chartModel().revenuePath" class="chart-line revenue-line" />
                <path [attr.d]="chartModel().expensePath" class="chart-line expense-line" />

                @for (point of chartModel().coordinates; track point.id) {
                  <circle [attr.cx]="point.x" [attr.cy]="point.revenueY" r="4.5" class="chart-point revenue-point" />
                  <circle [attr.cx]="point.x" [attr.cy]="point.expenseY" r="4.5" class="chart-point expense-point" />
                  <text [attr.x]="point.x" y="248" class="chart-month-label">{{ point.label }}</text>
                }
              </svg>
            </div>
          } @else {
            <div class="inline-state empty-state chart-empty">
              <strong>Aucune tendance exploitable pour l'instant</strong>
              <p>
                Les 12 derniers mois sont encore vides. Ajoutez des revenus ou des depenses pour alimenter le graphique.
              </p>
            </div>
          }

          <div class="chart-summary">
            <div>
              <span>Periode</span>
              <strong>12 derniers mois glissants</strong>
            </div>
            <div>
              <span>Point haut</span>
              <strong>{{ formatCompactCurrency(chartModel().maxValue) }}</strong>
            </div>
          </div>
        </article>

        <article class="panel spotlight-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Synthese</p>
              <h2>Points de vigilance</h2>
            </div>
          </div>

          <div class="spotlight-list">
            <article class="spotlight-card">
              <span class="spotlight-label">Campagnes actives</span>
              <strong>{{ summary().activeCampaigns }}</strong>
              <p>{{ summary().activeCampaigns ? 'Suivi commercial en cours.' : 'Aucune campagne active actuellement.' }}</p>
            </article>

            <article class="spotlight-card">
              <span class="spotlight-label">Clients recents</span>
              <strong>{{ recentClients().length }}</strong>
              <p>{{ recentClients().length ? 'Derniers comptes ajoutes visibles ci-dessous.' : 'Le portefeuille client est encore vide.' }}</p>
            </article>

            <article class="spotlight-card" [class.alert]="summary().netProfit < 0">
              <span class="spotlight-label">Equilibre financier</span>
              <strong>{{ summary().netProfit >= 0 ? 'Sain' : 'Sous tension' }}</strong>
              <p>
                {{ summary().netProfit >= 0 ? 'Les revenus couvrent actuellement les depenses.' : 'Verifier les depenses recentes ou renforcer les encaissements.' }}
              </p>
            </article>
          </div>
        </article>
      </section>

      <section class="details-grid">
        <article class="panel list-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Execution</p>
              <h2>Campagnes actives</h2>
            </div>
            <a routerLink="/campaigns" class="section-link">Voir les campagnes</a>
          </div>

          @if (!activeCampaigns().length) {
            <div class="inline-state empty-state">
              <strong>Aucune campagne active</strong>
              <p>Le module campagnes reste accessible pour lancer ou reactiver une initiative.</p>
            </div>
          } @else {
            <div class="stack-list">
              @for (campaign of activeCampaigns(); track campaign.id) {
                <article class="list-row">
                  <div class="list-main">
                    <div class="list-title-row">
                      <h3>{{ campaign.title }}</h3>
                      <span class="status-tag" [class.active]="campaign.status === campaignStatus.Active">
                        {{ getCampaignStatusLabel(campaign.status) }}
                      </span>
                    </div>
                    <p>{{ campaign.clientName ?? 'Client non renseigne' }}</p>
                    <dl>
                      <div>
                        <dt>Budget</dt>
                        <dd>{{ formatCurrency(campaign.amount) }}</dd>
                      </div>
                      <div>
                        <dt>Demarrage</dt>
                        <dd>{{ formatDate(campaign.startDate) }}</dd>
                      </div>
                      <div>
                        <dt>Fin</dt>
                        <dd>{{ campaign.endDate ? formatDate(campaign.endDate) : 'A definir' }}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              }
            </div>
          }
        </article>

        <article class="panel list-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Portefeuille</p>
              <h2>Clients recents</h2>
            </div>
            <a routerLink="/clients" class="section-link">Voir les clients</a>
          </div>

          @if (!recentClients().length) {
            <div class="inline-state empty-state">
              <strong>Aucun client recent</strong>
              <p>Le module clients permet de creer les premiers comptes visibles ici.</p>
            </div>
          } @else {
            <div class="stack-list">
              @for (client of recentClients(); track client.id) {
                <article class="list-row client-row">
                  <div class="client-avatar">{{ getClientInitials(client) }}</div>
                  <div class="list-main">
                    <div class="list-title-row">
                      <h3>{{ client.firstName }} {{ client.lastName }}</h3>
                      <span class="client-date">{{ formatDate(client.createdAt) }}</span>
                    </div>
                    <p>{{ client.email }}</p>
                  </div>
                </article>
              }
            </div>
          }
        </article>
      </section>

      @if (isRefreshing() && overview()) {
        <p class="sync-note">Le dashboard est en cours de resynchronisation avec le backend.</p>
      }
    }
  `,
  styles: [
    ':host { display: block; }'
  ]
})
export class DashboardComponent implements OnInit {
  readonly campaignStatus = CampaignStatus;

  private readonly dashboardService = inject(DashboardService);

  readonly overview = signal<DashboardOverviewDto | null>(null);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly summary = computed(() =>
    this.overview()?.summary ?? {
      totalRevenue: 0,
      totalExpense: 0,
      netProfit: 0,
      totalClients: 0,
      activeCampaigns: 0
    }
  );

  readonly activeCampaigns = computed(() => this.overview()?.activeCampaigns ?? []);
  readonly recentClients = computed(() => this.overview()?.recentClients ?? []);

  readonly chartModel = computed<ChartModel>(() => {
    const monthlyFinance = this.overview()?.monthlyFinance ?? [];
    const width = 640;
    const height = 260;
    const left = 28;
    const right = 28;
    const top = 24;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const values = monthlyFinance.flatMap(point => [point.revenue, point.expense]);
    const maxValue = Math.max(0, ...values);
    const hasData = monthlyFinance.some(point => point.revenue > 0 || point.expense > 0);
    const safeMaxValue = maxValue > 0 ? maxValue : 1;

    const coordinates = monthlyFinance.map((point, index) => {
      const x = monthlyFinance.length === 1
        ? left + plotWidth / 2
        : left + (index * plotWidth) / Math.max(monthlyFinance.length - 1, 1);

      return {
        id: `${point.year}-${point.month}`,
        label: monthFormatter.format(toMonthDate(point)),
        revenue: point.revenue,
        expense: point.expense,
        x,
        revenueY: top + plotHeight - (point.revenue / safeMaxValue) * plotHeight,
        expenseY: top + plotHeight - (point.expense / safeMaxValue) * plotHeight
      };
    });

    const ticks = Array.from({ length: 4 }, (_, index) => {
      const value = (safeMaxValue / 3) * (3 - index);
      return {
        value,
        y: top + (plotHeight / 3) * index
      };
    });

    return {
      hasData,
      maxValue,
      revenuePath: buildLinePath(coordinates, 'revenueY'),
      expensePath: buildLinePath(coordinates, 'expenseY'),
      coordinates,
      ticks
    };
  });

  ngOnInit(): void {
    this.loadOverview();
  }

  refreshOverview(): void {
    this.loadOverview(true);
  }

  formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  formatCompactCurrency(value: number): string {
    return compactCurrencyFormatter.format(value);
  }

  formatDate(value: string): string {
    return shortDateFormatter.format(new Date(value));
  }

  getCampaignStatusLabel(status: CampaignStatus): string {
    switch (status) {
      case CampaignStatus.Active:
        return 'Active';
      case CampaignStatus.Completed:
        return 'Terminee';
      case CampaignStatus.Cancelled:
        return 'Annulee';
      case CampaignStatus.Draft:
      default:
        return 'Brouillon';
    }
  }

  getClientInitials(client: RecentClientDto): string {
    return `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase();
  }

  private loadOverview(isManualRefresh = false): void {
    if (isManualRefresh) {
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
    }

    this.errorMessage.set(null);

    this.dashboardService
      .getOverview()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.isRefreshing.set(false);
        })
      )
      .subscribe({
        next: overview => {
          this.overview.set(overview);
        },
        error: error => {
          this.errorMessage.set(formatOverviewError(error));
        }
      });
  }
}
