import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClientDto, ClientService } from '../../services/client.service';
import { RevenueDto, RevenueService } from '../../services/revenue.service';
import { TagDto, TagService } from '../../services/tag.service';
import { ApiErrorResponse, TagCategory } from '../../services/domain.models';

@Component({
  selector: 'app-revenues',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">US-010</p>
        <h1>Revenus</h1>
        <p>
          Pilotez les encaissements avec creation, edition et suppression, meme si aucun
          client ni tag revenu n'existe encore.
        </p>
      </div>
      <button type="button" class="primary-action" (click)="startCreate()">
        Nouveau revenu
      </button>
    </section>

    <section class="summary-grid">
      <article class="summary-card accent">
        <span class="summary-label">Total revenus</span>
        <strong>{{ formatCurrency(totalAmount()) }}</strong>
        <p>{{ revenuesSorted().length }} ligne(s) enregistree(s)</p>
      </article>

      <article class="summary-card">
        <span class="summary-label">Clients relies</span>
        <strong>{{ revenuesWithClientCount() }}</strong>
        <p>{{ clients().length }} client(s) disponible(s) pour rattachement</p>
      </article>

      <article class="summary-card">
        <span class="summary-label">Tags revenus relies</span>
        <strong>{{ revenuesWithTagCount() }}</strong>
        <p>{{ tags().length }} tag(s) revenu disponible(s)</p>
      </article>
    </section>

    @if (globalError(); as errorMessage) {
      <section class="banner error-banner">
        <div>
          <strong>Chargement incomplet.</strong>
          <span>{{ errorMessage }}</span>
        </div>
        <button type="button" class="ghost-action" (click)="loadData()">Reessayer</button>
      </section>
    }

    <section class="content-grid">
      <article class="panel form-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Formulaire</p>
            <h2>{{ editingRevenueId() ? 'Modifier le revenu' : 'Creer un revenu' }}</h2>
          </div>
          @if (editingRevenueId()) {
            <button type="button" class="ghost-action" (click)="resetForm()">Annuler</button>
          }
        </div>

        <form [formGroup]="revenueForm" (ngSubmit)="submitForm()" class="revenue-form">
          <label>
            <span>Montant</span>
            <input type="number" min="0.01" step="0.01" formControlName="amount" />
          </label>

          <label>
            <span>Date</span>
            <input type="date" formControlName="date" />
          </label>

          <label>
            <span>Client optionnel</span>
            <select formControlName="clientId">
              <option value="">Aucun client</option>
              @for (client of clients(); track client.id) {
                <option [value]="client.id">{{ formatClientLabel(client) }}</option>
              }
            </select>
          </label>

          @if (!clients().length) {
            <p class="field-hint">
              Aucun client disponible pour le moment. Le revenu peut etre enregistre sans relation.
            </p>
          }

          <label>
            <span>Tag revenu optionnel</span>
            <select formControlName="tagId">
              <option value="">Aucun tag</option>
              @for (tag of tags(); track tag.id) {
                <option [value]="tag.id">{{ tag.name }}</option>
              }
            </select>
          </label>

          @if (!tags().length) {
            <p class="field-hint">
              Aucun tag revenu n'existe encore. Vous pouvez creer le revenu sans categorisation.
            </p>
          }

          @if (formError(); as errorMessage) {
            <p class="form-feedback error">{{ errorMessage }}</p>
          }

          @if (formSuccess(); as successMessage) {
            <p class="form-feedback success">{{ successMessage }}</p>
          }

          <div class="form-actions">
            <button
              type="submit"
              class="primary-action"
              [disabled]="formSubmitting() || loading()"
            >
              {{ formSubmitting() ? 'Enregistrement...' : editingRevenueId() ? 'Mettre a jour' : 'Creer le revenu' }}
            </button>

            <button
              type="button"
              class="ghost-action"
              (click)="resetForm()"
              [disabled]="formSubmitting()"
            >
              Reinitialiser
            </button>
          </div>
        </form>
      </article>

      <article class="panel list-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Liste</p>
            <h2>Historique des revenus</h2>
          </div>
          <button
            type="button"
            class="ghost-action"
            (click)="loadData()"
            [disabled]="loading()"
          >
            {{ loading() ? 'Actualisation...' : 'Actualiser' }}
          </button>
        </div>

        @if (loading()) {
          <div class="state-card">
            <strong>Chargement des revenus...</strong>
            <p>Lecture de la liste, des clients disponibles et des tags revenus.</p>
          </div>
        } @else if (!revenuesSorted().length) {
          <div class="state-card empty">
            <strong>Aucun revenu pour l'instant.</strong>
            <p>
              Le formulaire reste actif pour creer la premiere ligne, avec ou sans client et tag.
            </p>
          </div>
        } @else {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Client</th>
                  <th>Tag</th>
                  <th class="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (revenue of revenuesSorted(); track revenue.id) {
                  <tr>
                    <td>
                      <span class="primary-cell">{{ formatDate(revenue.date) }}</span>
                      <span class="secondary-cell">Cree le {{ formatDateTime(revenue.createdAt) }}</span>
                    </td>
                    <td>
                      <span class="primary-cell">{{ formatCurrency(revenue.amount) }}</span>
                    </td>
                    <td>
                      <span class="primary-cell">{{ revenue.clientName ?? 'Aucun client' }}</span>
                    </td>
                    <td>
                      <span class="primary-cell">{{ revenue.tagName ?? 'Aucun tag' }}</span>
                    </td>
                    <td class="actions-column">
                      <div class="row-actions">
                        <button type="button" class="ghost-action" (click)="startEdit(revenue)">
                          Modifier
                        </button>
                        <button
                          type="button"
                          class="danger-action"
                          (click)="deleteRevenue(revenue)"
                          [disabled]="deletingRevenueId() === revenue.id"
                        >
                          {{ deletingRevenueId() === revenue.id ? 'Suppression...' : 'Supprimer' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
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
      }

      .primary-action,
      .ghost-action,
      .danger-action {
        min-height: 2.75rem;
        padding: 0.7rem 1rem;
        border-radius: 999px;
        border: none;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      .primary-action {
        background: #18202a;
        color: #f6f3ec;
      }

      .ghost-action {
        border: 1px solid #c9d3dc;
        background: #ffffff;
        color: #18202a;
      }

      .danger-action {
        background: #fce8e5;
        color: #8a251b;
      }

      .primary-action:disabled,
      .ghost-action:disabled,
      .danger-action:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .summary-grid,
      .content-grid {
        display: grid;
        gap: 1rem;
      }

      .summary-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-bottom: 1rem;
      }

      .content-grid {
        grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
        align-items: start;
      }

      .summary-card,
      .panel,
      .banner,
      .state-card {
        border-radius: 1.25rem;
        border: 1px solid #d7dee5;
        background: #ffffff;
      }

      .summary-card {
        padding: 1.25rem;
      }

      .summary-label,
      .panel-kicker {
        display: block;
        margin-bottom: 0.45rem;
        color: #8a6a2f;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .summary-card strong {
        display: block;
        margin-bottom: 0.35rem;
        font-size: 1.6rem;
        color: #18202a;
      }

      .summary-card p,
      .panel p,
      .banner span,
      .state-card p,
      .field-hint,
      .secondary-cell {
        margin: 0;
        color: #51606f;
        line-height: 1.6;
      }

      .accent {
        background: #f6f3ec;
      }

      .banner,
      .state-card {
        padding: 1rem 1.1rem;
      }

      .banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .error-banner {
        border-color: #efc0ba;
        background: #fff3f1;
        color: #8a251b;
      }

      .error-banner strong {
        display: block;
        margin-bottom: 0.2rem;
      }

      .panel {
        padding: 1.25rem;
      }

      .panel-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0;
        color: #18202a;
      }

      .revenue-form {
        display: grid;
        gap: 0.9rem;
      }

      label {
        display: grid;
        gap: 0.45rem;
        color: #18202a;
        font-weight: 600;
      }

      input,
      select {
        min-height: 2.9rem;
        padding: 0.75rem 0.85rem;
        border: 1px solid #c9d3dc;
        border-radius: 0.9rem;
        background: #ffffff;
        color: #18202a;
        font: inherit;
      }

      input:focus,
      select:focus {
        outline: 2px solid rgba(15, 118, 110, 0.15);
        border-color: #0f766e;
      }

      .field-hint,
      .form-feedback {
        font-size: 0.95rem;
      }

      .form-feedback {
        margin: 0;
        padding: 0.75rem 0.9rem;
        border-radius: 0.9rem;
      }

      .form-feedback.error {
        background: #fff3f1;
        color: #8a251b;
      }

      .form-feedback.success {
        background: #ecf9f6;
        color: #0f766e;
      }

      .form-actions,
      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 0.95rem 0.65rem;
        border-bottom: 1px solid #e6ebf0;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: #607081;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .primary-cell,
      .secondary-cell {
        display: block;
      }

      .primary-cell {
        color: #18202a;
        font-weight: 600;
      }

      .secondary-cell {
        font-size: 0.9rem;
      }

      .actions-column {
        width: 1%;
        white-space: nowrap;
      }

      .empty {
        background: #f8fafb;
      }

      @media (max-width: 720px) {
        .page-header {
          flex-direction: column;
        }

        .banner,
        .panel-head,
        .form-actions,
        .row-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .actions-column {
          white-space: normal;
        }
      }

      @media (max-width: 960px) {
        .content-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class RevenuesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly revenueService = inject(RevenueService);
  private readonly clientService = inject(ClientService);
  private readonly tagService = inject(TagService);

  readonly loading = signal(true);
  readonly formSubmitting = signal(false);
  readonly globalError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);
  readonly editingRevenueId = signal<string | null>(null);
  readonly deletingRevenueId = signal<string | null>(null);
  readonly revenues = signal<RevenueDto[]>([]);
  readonly clients = signal<ClientDto[]>([]);
  readonly tags = signal<TagDto[]>([]);

  readonly revenuesSorted = computed(() => {
    return [...this.revenues()].sort((left, right) => {
      const dateComparison = right.date.localeCompare(left.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
  });

  readonly totalAmount = computed(() => {
    return this.revenues().reduce((sum, revenue) => sum + revenue.amount, 0);
  });

  readonly revenuesWithClientCount = computed(() => {
    return this.revenues().filter(revenue => revenue.clientId !== null).length;
  });

  readonly revenuesWithTagCount = computed(() => {
    return this.revenues().filter(revenue => revenue.tagId !== null).length;
  });

  readonly revenueForm = this.formBuilder.nonNullable.group({
    amount: ['', Validators.required],
    date: [this.getTodayIso(), Validators.required],
    clientId: [''],
    tagId: ['']
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.globalError.set(null);

    forkJoin({
      revenues: this.revenueService.getRevenues(),
      clients: this.clientService.getClients(),
      tags: this.tagService.getTags(TagCategory.Revenue)
    }).subscribe({
      next: ({ revenues, clients, tags }) => {
        this.revenues.set(revenues);
        this.clients.set(clients);
        this.tags.set(tags);
        this.loading.set(false);
      },
      error: error => {
        this.globalError.set(this.getErrorMessage(error, 'Impossible de charger les revenus.'));
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.resetForm();
  }

  startEdit(revenue: RevenueDto): void {
    this.editingRevenueId.set(revenue.id);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.revenueForm.setValue({
      amount: revenue.amount.toFixed(2),
      date: revenue.date,
      clientId: revenue.clientId ?? '',
      tagId: revenue.tagId ?? ''
    });
  }

  resetForm(): void {
    this.editingRevenueId.set(null);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.revenueForm.reset({
      amount: '',
      date: this.getTodayIso(),
      clientId: '',
      tagId: ''
    });
  }

  submitForm(): void {
    this.formError.set(null);
    this.formSuccess.set(null);

    if (this.revenueForm.invalid) {
      this.revenueForm.markAllAsTouched();
      this.formError.set('Montant et date sont requis pour enregistrer un revenu.');
      return;
    }

    const amountValue = this.revenueForm.controls.amount.value.trim();
    const parsedAmount = Number(amountValue);
    const date = this.revenueForm.controls.date.value.trim();

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      this.formError.set('Le montant doit etre superieur a zero.');
      return;
    }

    if (!date) {
      this.formError.set('La date est requise.');
      return;
    }

    const request = {
      amount: parsedAmount,
      date,
      clientId: this.normalizeOptionalId(this.revenueForm.controls.clientId.value),
      tagId: this.normalizeOptionalId(this.revenueForm.controls.tagId.value)
    };

    this.formSubmitting.set(true);

    const editingRevenueId = this.editingRevenueId();
    const operation = editingRevenueId
      ? this.revenueService.updateRevenue(editingRevenueId, request)
      : this.revenueService.createRevenue(request);

    operation.subscribe({
      next: revenue => {
        const successMessage = editingRevenueId
          ? 'Le revenu a ete mis a jour.'
          : 'Le revenu a ete cree.';

        this.upsertRevenue(revenue);
        this.formSubmitting.set(false);
        this.resetForm();
        this.formSuccess.set(successMessage);
      },
      error: error => {
        this.formSubmitting.set(false);
        this.formError.set(this.getErrorMessage(error, 'Enregistrement du revenu impossible.'));
      }
    });
  }

  deleteRevenue(revenue: RevenueDto): void {
    const confirmed = window.confirm(
      `Supprimer le revenu du ${this.formatDate(revenue.date)} pour ${this.formatCurrency(revenue.amount)} ?`
    );

    if (!confirmed) {
      return;
    }

    this.formError.set(null);
    this.formSuccess.set(null);
    this.deletingRevenueId.set(revenue.id);

    this.revenueService.deleteRevenue(revenue.id).subscribe({
      next: () => {
        this.revenues.update(current => current.filter(item => item.id !== revenue.id));
        this.deletingRevenueId.set(null);
        if (this.editingRevenueId() === revenue.id) {
          this.resetForm();
        }
        this.formSuccess.set('Le revenu a ete supprime.');
      },
      error: error => {
        this.deletingRevenueId.set(null);
        this.formError.set(this.getErrorMessage(error, 'Suppression du revenu impossible.'));
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium'
    }).format(new Date(`${value}T00:00:00`));
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  formatClientLabel(client: ClientDto): string {
    const baseLabel = `${client.firstName} ${client.lastName}`;

    if (client.companyName) {
      return `${baseLabel} · ${client.companyName}`;
    }

    return baseLabel;
  }

  private upsertRevenue(revenue: RevenueDto): void {
    this.revenues.update(current => {
      const existingIndex = current.findIndex(item => item.id === revenue.id);

      if (existingIndex === -1) {
        return [...current, revenue];
      }

      return current.map(item => (item.id === revenue.id ? revenue : item));
    });
  }

  private normalizeOptionalId(value: string): string | null {
    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private getTodayIso(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    const apiError = error as ApiErrorResponse | undefined;
    const originalError = apiError?.originalError?.error;

    if (typeof originalError === 'object' && originalError !== null && 'detail' in originalError) {
      const detail = (originalError as { detail?: string }).detail;

      if (detail) {
        return detail;
      }
    }

    if (apiError?.message) {
      return apiError.message;
    }

    return fallback;
  }
}