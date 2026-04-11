import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ClientDto,
  ClientService,
  CreateClientRequest,
  UpdateClientRequest
} from '../../services/client.service';
import { ApiErrorResponse, ApiProblemDetails } from '../../services/domain.models';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">US-008</p>
        <h1>Clients</h1>
        <p class="intro">
          Gere la base clients sans quitter le shell metier: creation, modification,
          suppression et resynchronisation immediate de la liste.
        </p>
      </div>
      <div class="status-pill">{{ totalClients() }} client{{ totalClients() > 1 ? 's' : '' }}</div>
    </section>

    @if (flashMessage(); as flashMessage) {
      <section class="banner" [class.error]="flashMessage.kind === 'error'">
        <strong>{{ flashMessage.kind === 'success' ? 'Operation effectuee' : 'Action bloquee' }}</strong>
        <p>{{ flashMessage.text }}</p>
      </section>
    }

    <section class="layout">
      <article class="card form-card">
        <div class="section-heading">
          <div>
            <p class="section-kicker">{{ editingClientId() ? 'Edition' : 'Creation' }}</p>
            <h2>{{ editingClientId() ? 'Modifier un client' : 'Ajouter un client' }}</h2>
          </div>
          @if (editingClientId()) {
            <button type="button" class="ghost-button" (click)="cancelEdit()">Annuler</button>
          }
        </div>

        <form #clientForm="ngForm" class="client-form" (ngSubmit)="submitForm(clientForm)">
          <label>
            Prenom
            <input
              type="text"
              name="firstName"
              [(ngModel)]="form.firstName"
              required
              maxlength="100"
              [disabled]="isSubmitting()"
            />
          </label>

          <label>
            Nom
            <input
              type="text"
              name="lastName"
              [(ngModel)]="form.lastName"
              required
              maxlength="100"
              [disabled]="isSubmitting()"
            />
          </label>

          <label class="field-span">
            Email
            <input
              type="email"
              name="email"
              [(ngModel)]="form.email"
              required
              email
              maxlength="255"
              [disabled]="isSubmitting()"
            />
          </label>

          <label>
            Telephone
            <input
              type="text"
              name="phone"
              [(ngModel)]="form.phone"
              maxlength="30"
              [disabled]="isSubmitting()"
            />
          </label>

          <label>
            Societe
            <input
              type="text"
              name="companyName"
              [(ngModel)]="form.companyName"
              maxlength="200"
              [disabled]="isSubmitting()"
            />
          </label>

          <div class="form-actions field-span">
            <button type="submit" class="primary-button" [disabled]="clientForm.invalid || isSubmitting()">
              {{ isSubmitting() ? 'Enregistrement...' : editingClientId() ? 'Mettre a jour' : 'Creer le client' }}
            </button>
            <button type="button" class="ghost-button" (click)="resetForm(clientForm)" [disabled]="isSubmitting()">
              Vider
            </button>
          </div>
        </form>
      </article>

      <article class="card list-card">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Portefeuille</p>
            <h2>Liste des clients</h2>
          </div>
          <button
            type="button"
            class="ghost-button"
            (click)="refreshClients()"
            [disabled]="isLoading() || isRefreshing()"
          >
            {{ isRefreshing() ? 'Synchronisation...' : 'Rafraichir' }}
          </button>
        </div>

        @if (listError(); as listError) {
          <div class="inline-state error-state">
            <strong>Chargement impossible</strong>
            <p>{{ listError }}</p>
          </div>
        } @else if (isLoading()) {
          <div class="inline-state">
            <strong>Chargement en cours</strong>
            <p>Recuperation des clients depuis l'API.</p>
          </div>
        } @else if (!clients().length) {
          <div class="inline-state empty-state">
            <strong>Aucun client pour le moment</strong>
            <p>Creez un premier client avec le formulaire pour demarrer le portefeuille.</p>
          </div>
        } @else {
          <div class="client-list">
            @for (client of clients(); track client.id) {
              <article class="client-row" [class.is-editing]="editingClientId() === client.id">
                <div class="client-main">
                  <div class="client-title-row">
                    <h3>{{ fullName(client) }}</h3>
                    @if (editingClientId() === client.id) {
                      <span class="editing-pill">Edition en cours</span>
                    }
                  </div>

                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{{ client.email }}</dd>
                    </div>
                    <div>
                      <dt>Telephone</dt>
                      <dd>{{ client.phone || 'Non renseigne' }}</dd>
                    </div>
                    <div>
                      <dt>Societe</dt>
                      <dd>{{ client.companyName || 'Non renseignee' }}</dd>
                    </div>
                    <div>
                      <dt>Cree le</dt>
                      <dd>{{ formatCreatedAt(client.createdAt) }}</dd>
                    </div>
                  </dl>
                </div>

                <div class="row-actions">
                  <button
                    type="button"
                    class="secondary-button"
                    (click)="startEdit(client)"
                    [disabled]="isSubmitting()"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="danger-button"
                    (click)="deleteClient(client)"
                    [disabled]="deletingClientId() === client.id || isSubmitting()"
                  >
                    {{ deletingClientId() === client.id ? 'Suppression...' : 'Supprimer' }}
                  </button>
                </div>
              </article>
            }
          </div>
        }

        @if (isRefreshing() && clients().length) {
          <p class="sync-note">La liste est en cours de resynchronisation avec le backend.</p>
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
        font-size: 2rem;
      }

      .intro {
        margin: 0;
        color: #51606f;
        line-height: 1.6;
        max-width: 48rem;
      }

      .status-pill {
        align-self: start;
        padding: 0.7rem 1rem;
        border-radius: 999px;
        background: #18202a;
        color: #f6f3ec;
        font-weight: 600;
      }

      .banner {
        margin-bottom: 1rem;
        padding: 1rem 1.1rem;
        border-radius: 1rem;
        background: #e8f3ec;
        border: 1px solid #b5d8c1;
        color: #17603a;
      }

      .banner.error {
        background: #fff0ee;
        border-color: #efc1b8;
        color: #8d2c1c;
      }

      .banner strong,
      .banner p {
        display: block;
      }

      .banner p {
        margin: 0.35rem 0 0;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
        gap: 1.25rem;
      }

      .card {
        padding: 1.5rem;
        border-radius: 1.25rem;
        border: 1px solid #d7dee5;
        background: #ffffff;
        box-shadow: 0 14px 30px rgba(24, 32, 42, 0.06);
      }

      .form-card {
        background: linear-gradient(180deg, #fffdf9 0%, #f7f2ea 100%);
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

      h2,
      h3 {
        margin: 0;
        color: #18202a;
      }

      .client-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.95rem;
      }

      label {
        margin: 0;
        display: grid;
        gap: 0.45rem;
        color: #344250;
        font-weight: 600;
      }

      .field-span {
        grid-column: 1 / -1;
      }

      input {
        min-height: 2.9rem;
        padding: 0.8rem 0.9rem;
        border-radius: 0.9rem;
        border: 1px solid #cbd5df;
        background: #ffffff;
        font: inherit;
        color: #18202a;
      }

      input:focus {
        outline: 2px solid rgba(15, 118, 110, 0.18);
        border-color: #0f766e;
      }

      button {
        min-height: 2.75rem;
        padding: 0 1rem;
        border-radius: 999px;
        border: none;
        font: inherit;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.65;
      }

      .form-actions,
      .row-actions {
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
        margin: 0.35rem 0 0;
        color: #51606f;
      }

      .error-state {
        background: #fff0ee;
        border-color: #efc1b8;
      }

      .empty-state {
        background: #f7f2ea;
      }

      .client-list {
        display: grid;
        gap: 0.9rem;
      }

      .client-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 1rem;
        padding: 1rem;
        border-radius: 1rem;
        border: 1px solid #d7dee5;
        background: #fbfcfd;
      }

      .client-row.is-editing {
        border-color: #0f766e;
        box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.2);
      }

      .client-main {
        min-width: 0;
      }

      .client-title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
        flex-wrap: wrap;
      }

      .editing-pill {
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        background: #e5f4f1;
        color: #0f766e;
        font-size: 0.85rem;
        font-weight: 600;
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

      .sync-note {
        margin: 0.9rem 0 0;
        color: #607081;
        font-size: 0.95rem;
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

        .client-form,
        dl,
        .client-row {
          grid-template-columns: 1fr;
        }

        .row-actions {
          justify-content: flex-start;
        }
      }
    `
  ]
})
export class ClientsComponent {
  private readonly clientService = inject(ClientService);

  readonly clients = signal<ClientDto[]>([]);
  readonly isLoading = signal(true);
  readonly isRefreshing = signal(false);
  readonly isSubmitting = signal(false);
  readonly listError = signal<string | null>(null);
  readonly editingClientId = signal<string | null>(null);
  readonly deletingClientId = signal<string | null>(null);
  readonly flashMessage = signal<{ kind: 'success' | 'error'; text: string } | null>(null);
  readonly totalClients = computed(() => this.clients().length);

  form = this.createEmptyForm();

  constructor() {
    this.loadClients();
  }

  refreshClients(): void {
    this.loadClients({ silent: true });
  }

  submitForm(formDirective: NgForm): void {
    if (formDirective.invalid || this.isSubmitting()) {
      formDirective.control.markAllAsTouched();
      return;
    }

    this.flashMessage.set(null);
    this.isSubmitting.set(true);

    const request = this.buildRequest();
    const editingId = this.editingClientId();

    const operation = editingId
      ? this.clientService.updateClient(editingId, request as UpdateClientRequest)
      : this.clientService.createClient(request as CreateClientRequest);

    operation
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: client => {
          this.upsertClient(client);
          this.flashMessage.set({
            kind: 'success',
            text: editingId
              ? 'Le client a ete mis a jour et la liste a ete resynchronisee.'
              : 'Le client a ete cree et ajoute a la liste.'
          });
          this.resetForm(formDirective);
          this.loadClients({ silent: true });
        },
        error: error => {
          this.flashMessage.set({
            kind: 'error',
            text: this.getActionErrorMessage(error, editingId ? 'update' : 'create')
          });
        }
      });
  }

  startEdit(client: ClientDto): void {
    this.editingClientId.set(client.id);
    this.flashMessage.set(null);
    this.form = {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone ?? '',
      companyName: client.companyName ?? ''
    };
  }

  cancelEdit(): void {
    this.editingClientId.set(null);
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

  deleteClient(client: ClientDto): void {
    const confirmed = window.confirm(
      `Supprimer ${this.fullName(client)} ? Cette action est definitive.`
    );

    if (!confirmed) {
      return;
    }

    this.flashMessage.set(null);
    this.deletingClientId.set(client.id);

    this.clientService
      .deleteClient(client.id)
      .pipe(finalize(() => this.deletingClientId.set(null)))
      .subscribe({
        next: () => {
          this.clients.update(currentClients => currentClients.filter(item => item.id !== client.id));

          if (this.editingClientId() === client.id) {
            this.cancelEdit();
          }

          this.flashMessage.set({
            kind: 'success',
            text: 'Le client a ete supprime et la liste a ete resynchronisee.'
          });
          this.loadClients({ silent: true });
        },
        error: error => {
          if ((error as ApiErrorResponse).status === 404) {
            this.clients.update(currentClients => currentClients.filter(item => item.id !== client.id));
            this.loadClients({ silent: true });
          }

          this.flashMessage.set({
            kind: 'error',
            text: this.getActionErrorMessage(error, 'delete')
          });
        }
      });
  }

  fullName(client: ClientDto): string {
    return `${client.firstName} ${client.lastName}`;
  }

  formatCreatedAt(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private loadClients(options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;

    if (silent) {
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
      this.listError.set(null);
    }

    this.clientService
      .getClients()
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
        next: clients => {
          this.clients.set(this.sortClients(clients));

          const editingId = this.editingClientId();
          if (editingId && !clients.some(client => client.id === editingId)) {
            this.cancelEdit();
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

  private upsertClient(client: ClientDto): void {
    this.clients.update(currentClients => {
      const existingIndex = currentClients.findIndex(item => item.id === client.id);

      if (existingIndex === -1) {
        return this.sortClients([client, ...currentClients]);
      }

      const nextClients = [...currentClients];
      nextClients[existingIndex] = client;
      return this.sortClients(nextClients);
    });
  }

  private sortClients(clients: ClientDto[]): ClientDto[] {
    return [...clients].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private buildRequest(): CreateClientRequest | UpdateClientRequest {
    return {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      email: this.form.email.trim(),
      phone: this.normalizeOptional(this.form.phone),
      companyName: this.normalizeOptional(this.form.companyName)
    };
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private createEmptyForm(): ClientFormValue {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyName: ''
    };
  }

  private getActionErrorMessage(error: unknown, action: 'load' | 'create' | 'update' | 'delete'): string {
    const apiError = error as ApiErrorResponse;
    const problem = this.extractProblemDetails(apiError);
    const detail = typeof problem?.detail === 'string' ? problem.detail : null;

    if (apiError?.status === 409) {
      return 'Un client avec cet e-mail existe deja. Utilisez une autre adresse.';
    }

    if (detail) {
      return this.translateProblemDetail(detail);
    }

    if (apiError?.status === 404 && action === 'delete') {
      return 'Ce client n\'existe plus. La liste a ete rechargee.';
    }

    if (typeof apiError?.message === 'string' && apiError.message.trim()) {
      return this.translateFrontendMessage(apiError.message);
    }

    switch (action) {
      case 'load':
        return 'Impossible de charger les clients pour le moment.';
      case 'create':
        return 'La creation du client a echoue.';
      case 'update':
        return 'La mise a jour du client a echoue.';
      case 'delete':
        return 'La suppression du client a echoue.';
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

    if (normalized.includes('already exists')) {
      return 'Un client avec cet e-mail existe deja. Utilisez une autre adresse.';
    }

    if (normalized.includes('firstname is required')) {
      return 'Le prenom est obligatoire.';
    }

    if (normalized.includes('lastname is required')) {
      return 'Le nom est obligatoire.';
    }

    if (normalized.includes('email is required')) {
      return 'L\'e-mail est obligatoire.';
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

interface ClientFormValue {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
}