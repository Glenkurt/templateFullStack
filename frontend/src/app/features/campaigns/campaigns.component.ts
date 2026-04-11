import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  CampaignDto,
  CampaignService,
  CreateCampaignRequest,
  UpdateCampaignRequest
} from '../../services/campaign.service';
import { ClientDto, ClientService } from '../../services/client.service';
import { ApiErrorResponse, ApiProblemDetails, CampaignStatus } from '../../services/domain.models';

const campaignDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const campaignDateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const campaignCurrencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const CAMPAIGN_STATUS_OPTIONS: ReadonlyArray<{ value: CampaignStatus; label: string }> = [
  { value: CampaignStatus.Draft, label: 'Brouillon' },
  { value: CampaignStatus.Active, label: 'Active' },
  { value: CampaignStatus.Completed, label: 'Terminee' },
  { value: CampaignStatus.Cancelled, label: 'Annulee' }
];

function normalizeCampaignAmount(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.round(parsedValue * 100) / 100;
}

function formatCampaignAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function compareCampaigns(left: CampaignDto, right: CampaignDto): number {
  const startDateComparison = right.startDate.localeCompare(left.startDate);

  if (startDateComparison !== 0) {
    return startDateComparison;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">US-011</p>
        <h1>Campagnes</h1>
        <p class="intro">
          Pilotez les campagnes commerciales avec creation, edition du statut, budget, dates
          et rattachement obligatoire a un client valide deja connu du portefeuille.
        </p>
      </div>
      <div class="header-actions">
        <div class="status-pill">{{ sortedCampaigns().length }} campagne{{ sortedCampaigns().length > 1 ? 's' : '' }}</div>
        <button type="button" class="ghost-button" (click)="refreshData()" [disabled]="isLoading() || isRefreshing()">
          {{ isRefreshing() ? 'Synchronisation...' : 'Actualiser' }}
        </button>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card accent">
        <span class="stat-value">{{ activeCampaignsCount() }}</span>
        <span class="stat-label">active{{ activeCampaignsCount() > 1 ? 's' : '' }}</span>
      </article>

      <article class="stat-card">
        <span class="stat-value">{{ formatCurrency(totalBudget()) }}</span>
        <span class="stat-label">budget cumule visible</span>
      </article>

      <article class="stat-card">
        <span class="stat-value">{{ clients().length }}</span>
        <span class="stat-label">client{{ clients().length > 1 ? 's' : '' }} disponible{{ clients().length > 1 ? 's' : '' }}</span>
      </article>
    </section>

    @if (flashMessage(); as flashMessage) {
      <section class="banner" [class.error]="flashMessage.kind === 'error'">
        <strong>{{ flashMessage.kind === 'success' ? 'Operation effectuee' : 'Action bloquee' }}</strong>
        <p>{{ flashMessage.text }}</p>
      </section>
    }

    @if (!isLoading() && !clients().length) {
      <section class="banner warning">
        <strong>Aucun client exploitable</strong>
        <p>
          Une campagne ne peut pas etre creee sans client valide. Creez d'abord un client dans
          le module dedie.
        </p>
        <a routerLink="/clients" class="inline-link">Ouvrir les clients</a>
      </section>
    }

    <section class="layout">
      <article class="card form-card">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Formulaire</p>
            <h2>{{ editingCampaignId() ? 'Modifier une campagne' : 'Creer une campagne' }}</h2>
          </div>
          @if (editingCampaignId()) {
            <button type="button" class="ghost-button" (click)="cancelEdit()" [disabled]="isSubmitting()">
              Annuler
            </button>
          }
        </div>

        <form #campaignForm="ngForm" class="campaign-form" (ngSubmit)="submitForm(campaignForm)">
          <label class="field-span">
            Titre
            <input
              type="text"
              name="title"
              [(ngModel)]="form.title"
              #titleField="ngModel"
              required
              maxlength="200"
              [disabled]="isSubmitting()"
            />
            @if (titleField.invalid && titleField.touched) {
              <small>{{ getTitleErrorMessage() }}</small>
            }
          </label>

          <label class="field-span">
            Description
            <textarea
              name="description"
              [(ngModel)]="form.description"
              maxlength="2000"
              rows="4"
              [disabled]="isSubmitting()"
            ></textarea>
            <small class="hint">Optionnelle, utile pour contextualiser l'objectif commercial.</small>
          </label>

          <div class="field-row">
            <label>
              Budget
              <input
                type="text"
                inputmode="decimal"
                name="amount"
                [(ngModel)]="form.amountInput"
                #amountField="ngModel"
                required
                [disabled]="isSubmitting()"
                placeholder="Ex. 2500,00"
              />
              @if (showAmountFieldError(amountField)) {
                <small>{{ getAmountErrorMessage() }}</small>
              }
            </label>

            <label>
              Statut
              <select
                name="status"
                [(ngModel)]="form.status"
                #statusField="ngModel"
                required
                [disabled]="isSubmitting()"
              >
                @for (statusOption of statusOptions; track statusOption.value) {
                  <option [ngValue]="statusOption.value">{{ statusOption.label }}</option>
                }
              </select>
              @if (statusField.invalid && statusField.touched) {
                <small>Le statut est obligatoire.</small>
              }
            </label>
          </div>

          <div class="field-row">
            <label>
              Date de debut
              <input
                type="date"
                name="startDate"
                [(ngModel)]="form.startDate"
                #startDateField="ngModel"
                required
                [disabled]="isSubmitting()"
              />
              @if (startDateField.invalid && startDateField.touched) {
                <small>La date de debut est obligatoire.</small>
              }
            </label>

            <label>
              Date de fin
              <input
                type="date"
                name="endDate"
                [(ngModel)]="form.endDate"
                [disabled]="isSubmitting()"
              />
              <small class="hint">Laissez vide si la campagne n'a pas encore de date de fin.</small>
            </label>
          </div>

          <label class="field-span">
            Client
            <select
              name="clientId"
              [(ngModel)]="form.clientId"
              #clientField="ngModel"
              required
              [disabled]="isSubmitting() || !clients().length"
            >
              <option value="">Selectionnez un client</option>
              @for (client of clients(); track client.id) {
                <option [value]="client.id">{{ formatClientLabel(client) }}</option>
              }
            </select>
            @if (showClientFieldError(clientField)) {
              <small>{{ getClientErrorMessage() }}</small>
            } @else if (!clients().length) {
              <small class="hint">Aucun client actif pour rattacher la campagne.</small>
            }
          </label>

          @if (dateConsistencyMessage(); as dateConsistencyMessage) {
            <p class="form-feedback error">{{ dateConsistencyMessage }}</p>
          }

          <div class="form-actions field-span">
            <button
              type="submit"
              class="primary-button"
              [disabled]="isSubmitting() || !clients().length"
            >
              {{ isSubmitting() ? 'Enregistrement...' : editingCampaignId() ? 'Mettre a jour' : 'Creer la campagne' }}
            </button>
            <button type="button" class="ghost-button" (click)="resetForm(campaignForm)" [disabled]="isSubmitting()">
              Vider
            </button>
          </div>
        </form>
      </article>

      <article class="card list-card">
        <div class="section-heading list-heading">
          <div>
            <p class="section-kicker">Portefeuille</p>
            <h2>Liste des campagnes</h2>
          </div>
          @if (isRefreshing() && campaigns().length) {
            <span class="sync-note">Resynchronisation en cours</span>
          }
        </div>

        @if (listError(); as listError) {
          <div class="inline-state error-state">
            <strong>Chargement impossible</strong>
            <p>{{ listError }}</p>
          </div>
        } @else if (isLoading()) {
          <div class="inline-state">
            <strong>Chargement en cours</strong>
            <p>Lecture des campagnes et des clients relies depuis l'API.</p>
          </div>
        } @else if (!campaigns().length) {
          <div class="inline-state empty-state">
            <strong>Aucune campagne pour le moment</strong>
            <p>Le formulaire reste disponible pour creer la premiere campagne rattachee a un client.</p>
          </div>
        } @else {
          <div class="campaign-list">
            @for (campaign of sortedCampaigns(); track campaign.id) {
              <article class="campaign-row" [class.is-editing]="editingCampaignId() === campaign.id">
                <div class="campaign-main">
                  <div class="campaign-title-row">
                    <div>
                      <h3>{{ campaign.title }}</h3>
                      <p class="campaign-client">{{ campaign.clientName || resolveClientName(campaign.clientId) }}</p>
                    </div>
                    <div class="pills">
                      <span class="status-chip" [class]="'status-' + campaign.status.toLowerCase()">
                        {{ getStatusLabel(campaign.status) }}
                      </span>
                      <span class="amount-chip">{{ formatCurrency(campaign.amount) }}</span>
                    </div>
                  </div>

                  @if (campaign.description) {
                    <p class="campaign-description">{{ campaign.description }}</p>
                  }

                  <dl>
                    <div>
                      <dt>Periode</dt>
                      <dd>{{ formatDateRange(campaign.startDate, campaign.endDate) }}</dd>
                    </div>
                    <div>
                      <dt>Budget</dt>
                      <dd>{{ formatCurrency(campaign.amount) }}</dd>
                    </div>
                    <div>
                      <dt>Statut</dt>
                      <dd>{{ getStatusLabel(campaign.status) }}</dd>
                    </div>
                    <div>
                      <dt>Creee le</dt>
                      <dd>{{ formatDateTime(campaign.createdAt) }}</dd>
                    </div>
                  </dl>
                </div>

                <div class="row-actions">
                  <button type="button" class="secondary-button" (click)="startEdit(campaign)" [disabled]="isSubmitting()">
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="danger-button"
                    (click)="deleteCampaign(campaign)"
                    [disabled]="deletingCampaignId() === campaign.id || isSubmitting()"
                  >
                    {{ deletingCampaignId() === campaign.id ? 'Suppression...' : 'Supprimer' }}
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </article>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .header-actions {
        display: grid;
        gap: 0.75rem;
      }

      .eyebrow {
        margin: 0 0 0.5rem;
        color: #8a6a2f;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
        font-weight: 700;
      }

      h1 {
        margin: 0 0 0.75rem;
        color: #18202a;
        font-size: 2rem;
      }

      p {
        margin: 0;
        color: #51606f;
        line-height: 1.6;
      }

      .status-pill {
        padding: 0.7rem 1rem;
        border-radius: 999px;
        background: #18202a;
        color: #f6f3ec;
        font-weight: 600;
      }

      .stats-grid,
      .layout {
        display: grid;
        gap: 1rem;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        margin-bottom: 1rem;
      }

      .layout {
        grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
        align-items: start;
      }

      .card,
      .stat-card,
      .banner {
        border-radius: 1.25rem;
        border: 1px solid #d7dee5;
        background: #ffffff;
        box-shadow: 0 14px 30px rgba(24, 32, 42, 0.06);
      }

      .card {
        padding: 1.4rem;
      }

      .stat-card {
        padding: 1.2rem;
      }

      .stat-value {
        display: block;
        color: #18202a;
        font-size: 1.6rem;
        font-weight: 700;
      }

      .stat-label {
        display: block;
        margin-top: 0.35rem;
        color: #51606f;
      }

      .accent {
        background: #f6f3ec;
      }

      .banner {
        margin-bottom: 1rem;
        padding: 1rem 1.1rem;
      }

      .banner p {
        margin-top: 0.35rem;
      }

      .banner.error {
        background: #fff0ee;
        border-color: #efc1b8;
        color: #8d2c1c;
      }

      h2,
      h3 {
        margin: 0;
        color: #18202a;
      }

      .section-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .section-kicker {
        margin: 0 0 0.35rem;
        color: #8a6a2f;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .campaign-form {
        display: grid;
        gap: 1rem;
      }

      .field-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .field-span {
        grid-column: 1 / -1;
      }

      label {
        display: grid;
        gap: 0.45rem;
        color: #344250;
        font-weight: 600;
      }

      input,
      select,
      textarea,
      button {
        font: inherit;
      }

      input,
      select,
      textarea {
        width: 100%;
        min-height: 2.9rem;
        padding: 0.8rem 0.9rem;
        border-radius: 0.9rem;
        border: 1px solid #cbd5df;
        background: #ffffff;
        color: #18202a;
      }

      textarea {
        min-height: 7rem;
        resize: vertical;
      }

      input:focus,
      select:focus,
      textarea:focus {
        outline: 2px solid rgba(15, 118, 110, 0.18);
        border-color: #0f766e;
      }

      small {
        color: #8d2c1c;
        line-height: 1.45;
      }

      .hint {
        color: #607081;
      }

      .form-feedback {
        margin: 0;
        padding: 0.85rem 0.95rem;
        border-radius: 0.95rem;
      }

      .form-feedback.error {
        background: #fff1ef;
        color: #8d2c1c;
      }

      button {
        min-height: 2.8rem;
        padding: 0 1rem;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      button:disabled,
      input:disabled,
      select:disabled,
      textarea:disabled {
        cursor: not-allowed;
        opacity: 0.65;
      }

      .form-actions,
      .row-actions,
      .pills {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .primary-button {
        background: #18202a;
        color: #f6f3ec;
        font-weight: 600;
      }

      .secondary-button,
      .ghost-button {
        background: #edf2f7;
        color: #18202a;
      }

      .danger-button {
        background: #8d2c1c;
        color: #fff6f3;
      }

      .inline-state {
        padding: 1rem;
        border-radius: 1rem;
        background: #f6f7f9;
        border: 1px solid #d7dee5;
      }

      .inline-state p {
        margin-top: 0.35rem;
      }

      .error-state {
        background: #fff0ee;
        border-color: #efc1b8;
      }

      .empty-state {
        background: #f7f2ea;
      }

      .campaign-list {
        display: grid;
        gap: 0.9rem;
      }

      .campaign-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 1rem;
        padding: 1rem;
        border-radius: 1rem;
        border: 1px solid #d7dee5;
        background: #fbfcfd;
      }

      .campaign-row.is-editing {
        border-color: #0f766e;
      }

      .campaign-title-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 0.75rem;
      }

      .status-chip,
      .amount-chip {
        display: inline-flex;
        align-items: center;
        min-height: 2.15rem;
        padding: 0 0.8rem;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .amount-chip {
        background: #e8f3ec;
        color: #17603a;
      }

      .status-active {
        background: #e5f4f1;
        color: #0f766e;
      }

      .status-completed {
        background: #e8f3ec;
        color: #17603a;
      }

      .status-cancelled {
        background: #fff0ee;
        color: #8d2c1c;
      }

      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
        margin: 0;
      }

      dt {
        margin: 0 0 0.2rem;
        color: #607081;
        font-size: 0.85rem;
      }

      dd {
        margin: 0;
        color: #18202a;
        overflow-wrap: anywhere;
      }

      @media (max-width: 980px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .page-header {
          flex-direction: column;
        }

        .header-actions {
          justify-items: start;
        }

        .field-row,
        .campaign-row,
        dl,
        .campaign-title-row {
          grid-template-columns: 1fr;
          flex-direction: column;
        }
      }
    `
  ]
})
export class CampaignsComponent {
  private readonly campaignService = inject(CampaignService);
  private readonly clientService = inject(ClientService);

  readonly campaigns = signal<CampaignDto[]>([]);
  readonly clients = signal<ClientDto[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly isSubmitting = signal(false);
  readonly listError = signal<string | null>(null);
  readonly editingCampaignId = signal<string | null>(null);
  readonly deletingCampaignId = signal<string | null>(null);
  readonly flashMessage = signal<{ kind: 'success' | 'error'; text: string } | null>(null);
  readonly statusOptions = CAMPAIGN_STATUS_OPTIONS;
  readonly sortedCampaigns = computed(() => [...this.campaigns()].sort(compareCampaigns));
  readonly activeCampaignsCount = computed(
    () => this.campaigns().filter(campaign => campaign.status === CampaignStatus.Active).length
  );
  readonly totalBudget = computed(() =>
    this.campaigns().reduce((total, campaign) => total + campaign.amount, 0)
  );
  readonly dateConsistencyMessage = computed(() => this.getDateConsistencyMessage());

  form = this.createEmptyForm();

  constructor() {
    this.loadData();
  }

  refreshData(): void {
    this.loadData({ silent: true });
  }

  submitForm(formDirective: NgForm): void {
    if (this.isSubmitting()) {
      return;
    }

    if (formDirective.invalid) {
      formDirective.control.markAllAsTouched();
      this.flashMessage.set({
        kind: 'error',
        text: 'Le formulaire contient des champs obligatoires manquants ou invalides.'
      });
      return;
    }

    const amount = normalizeCampaignAmount(this.form.amountInput);
    if (amount === null || amount <= 0) {
      this.flashMessage.set({
        kind: 'error',
        text: 'Le budget doit etre un montant positif avec deux decimales maximum.'
      });
      return;
    }

    const dateConsistencyMessage = this.getDateConsistencyMessage();
    if (dateConsistencyMessage) {
      this.flashMessage.set({ kind: 'error', text: dateConsistencyMessage });
      return;
    }

    const selectedClient = this.clients().find(client => client.id === this.form.clientId);
    if (!selectedClient) {
      this.flashMessage.set({
        kind: 'error',
        text: 'Selectionnez un client valide avant d\'enregistrer la campagne.'
      });
      return;
    }

    const request = this.buildRequest(amount);
    const editingId = this.editingCampaignId();
    const operation = editingId
      ? this.campaignService.updateCampaign(editingId, request as UpdateCampaignRequest)
      : this.campaignService.createCampaign(request as CreateCampaignRequest);

    this.flashMessage.set(null);
    this.isSubmitting.set(true);

    operation
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: campaign => {
          this.upsertCampaign(campaign);
          this.flashMessage.set({
            kind: 'success',
            text: editingId
              ? 'La campagne a ete mise a jour et la liste a ete resynchronisee.'
              : 'La campagne a ete creee et ajoutee a la liste.'
          });
          this.resetForm(formDirective);
          this.loadData({ silent: true });
        },
        error: error => {
          this.flashMessage.set({
            kind: 'error',
            text: this.getActionErrorMessage(error, editingId ? 'update' : 'create')
          });
        }
      });
  }

  startEdit(campaign: CampaignDto): void {
    this.editingCampaignId.set(campaign.id);
    this.flashMessage.set(null);
    this.form = {
      title: campaign.title,
      description: campaign.description ?? '',
      amountInput: formatCampaignAmountInput(campaign.amount),
      startDate: campaign.startDate,
      endDate: campaign.endDate ?? '',
      status: campaign.status,
      clientId: campaign.clientId
    };
  }

  cancelEdit(): void {
    this.editingCampaignId.set(null);
    this.form = this.createEmptyForm();
  }

  resetForm(formDirective?: NgForm): void {
    this.cancelEdit();

    if (formDirective) {
      const emptyForm = this.createEmptyForm();
      formDirective.resetForm(emptyForm);
      this.form = emptyForm;
    }
  }

  deleteCampaign(campaign: CampaignDto): void {
    const confirmed = window.confirm(
      `Supprimer la campagne "${campaign.title}" ? Cette action est definitive.`
    );

    if (!confirmed) {
      return;
    }

    this.flashMessage.set(null);
    this.deletingCampaignId.set(campaign.id);

    this.campaignService
      .deleteCampaign(campaign.id)
      .pipe(finalize(() => this.deletingCampaignId.set(null)))
      .subscribe({
        next: () => {
          this.campaigns.update(currentCampaigns =>
            currentCampaigns.filter(item => item.id !== campaign.id)
          );

          if (this.editingCampaignId() === campaign.id) {
            this.cancelEdit();
          }

          this.flashMessage.set({
            kind: 'success',
            text: 'La campagne a ete supprimee et la liste a ete resynchronisee.'
          });
          this.loadData({ silent: true });
        },
        error: error => {
          if ((error as ApiErrorResponse).status === 404) {
            this.campaigns.update(currentCampaigns =>
              currentCampaigns.filter(item => item.id !== campaign.id)
            );
            this.loadData({ silent: true });
          }

          this.flashMessage.set({
            kind: 'error',
            text: this.getActionErrorMessage(error, 'delete')
          });
        }
      });
  }

  formatCurrency(value: number): string {
    return campaignCurrencyFormatter.format(value);
  }

  formatDate(value: string): string {
    return campaignDateFormatter.format(new Date(`${value}T00:00:00`));
  }

  formatDateTime(value: string): string {
    return campaignDateTimeFormatter.format(new Date(value));
  }

  formatDateRange(startDate: string, endDate: string | null): string {
    if (!endDate) {
      return `${this.formatDate(startDate)} - en cours`;
    }

    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  }

  formatClientLabel(client: ClientDto): string {
    const fullName = `${client.firstName} ${client.lastName}`;

    if (client.companyName) {
      return `${fullName} - ${client.companyName}`;
    }

    return fullName;
  }

  resolveClientName(clientId: string): string {
    return this.clients().find(client => client.id === clientId)
      ? this.formatClientLabel(this.clients().find(client => client.id === clientId)!)
      : 'Client indisponible';
  }

  getStatusLabel(status: CampaignStatus): string {
    return this.statusOptions.find(statusOption => statusOption.value === status)?.label ?? status;
  }

  getTitleErrorMessage(): string {
    if (!this.form.title.trim()) {
      return 'Le titre est obligatoire.';
    }

    if (this.form.title.trim().length > 200) {
      return 'Le titre ne peut pas depasser 200 caracteres.';
    }

    return 'Le titre est invalide.';
  }

  showAmountFieldError(amountField: { touched: boolean | null }): boolean {
    return !!amountField.touched && normalizeCampaignAmount(this.form.amountInput) === null;
  }

  getAmountErrorMessage(): string {
    if (!this.form.amountInput.trim()) {
      return 'Le budget est obligatoire.';
    }

    const amount = normalizeCampaignAmount(this.form.amountInput);
    if (amount === null) {
      return 'Saisissez un montant valide avec deux decimales maximum.';
    }

    if (amount <= 0) {
      return 'Le budget doit etre strictement positif.';
    }

    return 'Le budget est invalide.';
  }

  showClientFieldError(clientField: { touched: boolean | null }): boolean {
    return !!clientField.touched && !this.isClientSelectionValid();
  }

  getClientErrorMessage(): string {
    if (!this.form.clientId) {
      return 'Le client est obligatoire.';
    }

    return 'Selectionnez un client valide de la liste.';
  }

  private loadData(options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;

    if (silent) {
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
      this.listError.set(null);
    }

    forkJoin({
      campaigns: this.campaignService.getCampaigns(),
      clients: this.clientService.getClients()
    })
      .pipe(
        finalize(() => {
          if (silent) {
            this.isRefreshing.set(false);
          } else {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: ({ campaigns, clients }) => {
          this.clients.set(this.sortClients(clients));
          this.campaigns.set([...campaigns].sort(compareCampaigns));

          const editingId = this.editingCampaignId();
          if (editingId && !campaigns.some(campaign => campaign.id === editingId)) {
            this.cancelEdit();
          }

          if (this.form.clientId && !this.isClientSelectionValid()) {
            this.form.clientId = '';
          }
        },
        error: error => {
          const message = this.getActionErrorMessage(error, 'load');

          if (silent) {
            this.flashMessage.set({
              kind: 'error',
              text: `Action enregistree, mais la liste n'a pas pu etre resynchronisee: ${message}`
            });
            return;
          }

          this.listError.set(message);
        }
      });
  }

  private buildRequest(amount: number): CreateCampaignRequest | UpdateCampaignRequest {
    return {
      title: this.form.title.trim(),
      description: this.normalizeOptional(this.form.description),
      amount,
      startDate: this.form.startDate,
      endDate: this.normalizeOptional(this.form.endDate),
      status: this.form.status,
      clientId: this.form.clientId
    };
  }

  private upsertCampaign(campaign: CampaignDto): void {
    this.campaigns.update(currentCampaigns => {
      const existingIndex = currentCampaigns.findIndex(item => item.id === campaign.id);

      if (existingIndex === -1) {
        return [...currentCampaigns, campaign].sort(compareCampaigns);
      }

      const nextCampaigns = [...currentCampaigns];
      nextCampaigns[existingIndex] = campaign;
      return nextCampaigns.sort(compareCampaigns);
    });
  }

  private sortClients(clients: ClientDto[]): ClientDto[] {
    return [...clients].sort((left, right) => {
      const leftName = `${left.firstName} ${left.lastName}`.toLowerCase();
      const rightName = `${right.firstName} ${right.lastName}`.toLowerCase();
      return leftName.localeCompare(rightName, 'fr');
    });
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private createEmptyForm(): CampaignFormValue {
    return {
      title: '',
      description: '',
      amountInput: '',
      startDate: this.getTodayIsoDate(),
      endDate: '',
      status: CampaignStatus.Draft,
      clientId: ''
    };
  }

  private getTodayIsoDate(): string {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }

  private isClientSelectionValid(): boolean {
    return this.clients().some(client => client.id === this.form.clientId);
  }

  private getDateConsistencyMessage(): string | null {
    if (!this.form.startDate) {
      return null;
    }

    if (this.form.endDate && this.form.endDate < this.form.startDate) {
      return 'La date de fin ne peut pas etre anterieure a la date de debut.';
    }

    return null;
  }

  private getActionErrorMessage(
    error: unknown,
    action: 'load' | 'create' | 'update' | 'delete'
  ): string {
    const apiError = error as ApiErrorResponse;
    const problem = this.extractProblemDetails(apiError);
    const detail = typeof problem?.detail === 'string' ? problem.detail : null;

    if (detail) {
      return this.translateProblemDetail(detail);
    }

    if (apiError?.status === 404 && action === 'delete') {
      return 'Cette campagne n\'existe plus. La liste a ete rechargee.';
    }

    if (typeof apiError?.message === 'string' && apiError.message.trim()) {
      return this.translateFrontendMessage(apiError.message);
    }

    switch (action) {
      case 'load':
        return 'Impossible de charger les campagnes pour le moment.';
      case 'create':
        return 'La creation de la campagne a echoue.';
      case 'update':
        return 'La mise a jour de la campagne a echoue.';
      case 'delete':
        return 'La suppression de la campagne a echoue.';
    }
  }

  private extractProblemDetails(error: ApiErrorResponse | null | undefined): ApiProblemDetails | null {
    if (!error?.originalError || typeof error.originalError !== 'object') {
      return null;
    }

    const originalError = error.originalError as { error?: ApiProblemDetails | unknown };
    const problem = originalError.error;

    if (!problem || typeof problem !== 'object') {
      return null;
    }

    return problem as ApiProblemDetails;
  }

  private translateProblemDetail(detail: string): string {
    const normalized = detail.trim().toLowerCase();

    if (normalized.includes('client not found')) {
      return 'Le client selectionne est invalide ou n\'est plus disponible.';
    }

    if (normalized.includes('campaign end date cannot be before start date')) {
      return 'La date de fin ne peut pas etre anterieure a la date de debut.';
    }

    if (normalized.includes('campaign status is invalid')) {
      return 'Le statut choisi n\'est pas reconnu par le backend.';
    }

    if (normalized.includes('title')) {
      return 'Le titre de la campagne est obligatoire.';
    }

    if (normalized.includes('amount')) {
      return 'Le budget de la campagne doit etre superieur a zero.';
    }

    return detail;
  }

  private translateFrontendMessage(message: string): string {
    const normalized = message.trim().toLowerCase();

    if (normalized.includes('unable to connect to the server')) {
      return 'Connexion au serveur impossible. Verifiez que l\'API est demarree.';
    }

    if (normalized.includes('requested resource was not found')) {
      return 'La ressource demandee est introuvable.';
    }

    if (normalized.includes('session has expired')) {
      return 'Votre session a expire. Reconnectez-vous pour continuer.';
    }

    return message;
  }
}

interface CampaignFormValue {
  title: string;
  description: string;
  amountInput: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  clientId: string;
}