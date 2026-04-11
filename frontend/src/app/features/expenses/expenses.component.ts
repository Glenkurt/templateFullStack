import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {
  ExpenseDto,
  ExpenseService,
  type CreateExpenseRequest,
  type UpdateExpenseRequest
} from '../../services/expense.service';
import { TagDto, TagService } from '../../services/tag.service';
import { ApiErrorResponse, ApiProblemDetails, TagCategory } from '../../services/domain.models';

const expenseDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const expenseCurrencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function normalizeExpenseAmount(value: string): number | null {
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

function expenseAmountValidator(control: AbstractControl<string>): ValidationErrors | null {
  const normalizedValue = normalizeExpenseAmount(control.value);

  if (normalizedValue === null) {
    return { invalidAmount: true };
  }

  if (normalizedValue <= 0) {
    return { minAmount: true };
  }

  return null;
}

function formatExpenseAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function coerceExpenseError(error: unknown, fallbackMessage: string): string {
  const apiError = error as ApiErrorResponse | null;
  const problemDetails = apiError?.originalError?.error as ApiProblemDetails | undefined;
  const validationErrors = problemDetails?.errors;

  if (validationErrors) {
    const flattenedErrors = Object.values(validationErrors).flat().filter(Boolean);
    if (flattenedErrors.length > 0) {
      return flattenedErrors.join(' ');
    }
  }

  return problemDetails?.detail ?? apiError?.message ?? fallbackMessage;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">US-009 livree</p>
        <h1>Depenses</h1>
        <p class="intro">
          Suivi des depenses en une seule vue, avec creation, edition, suppression et tri par date
          sans dependre du futur composant shared pour les tags.
        </p>
      </div>

      <div class="header-actions">
        <div class="status-pill">
          {{ sortedExpenses().length }} ligne{{ sortedExpenses().length > 1 ? 's' : '' }}
        </div>
        <button type="button" class="secondary-button" (click)="startCreate()">
          {{ editingExpenseId() ? 'Nouvelle depense' : 'Vider le formulaire' }}
        </button>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card accent">
        <span class="stat-value">{{ sortedExpenses().length }}</span>
        <span class="stat-label">depense{{ sortedExpenses().length > 1 ? 's' : '' }}</span>
      </article>

      <article class="stat-card">
        <span class="stat-value">{{ formatCurrency(totalAmount()) }}</span>
        <span class="stat-label">total visible</span>
      </article>

      <article class="stat-card">
        <span class="stat-value">{{ latestExpenseDateLabel() }}</span>
        <span class="stat-label">date la plus recente</span>
      </article>
    </section>

    @if (feedbackMessage(); as feedback) {
      <section class="feedback-banner" [class.error]="feedback.type === 'error'">
        {{ feedback.message }}
      </section>
    }

    <section class="content-grid">
      <article class="card">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Formulaire</p>
            <h2>{{ editingExpenseId() ? 'Modifier une depense' : 'Ajouter une depense' }}</h2>
          </div>

          @if (editingExpenseId()) {
            <button type="button" class="ghost-button" (click)="startCreate()">
              Annuler l'edition
            </button>
          }
        </div>

        <form class="expense-form" [formGroup]="expenseForm" (ngSubmit)="submitExpense()">
          <label class="field">
            <span>Libelle</span>
            <input
              type="text"
              formControlName="name"
              maxlength="200"
              placeholder="Ex. Outils de prospection"
            />
            @if (showFieldError('name')) {
              <small>{{ getNameErrorMessage() }}</small>
            }
          </label>

          <div class="field-row">
            <label class="field">
              <span>Montant</span>
              <input
                type="text"
                inputmode="decimal"
                formControlName="amountInput"
                placeholder="Ex. 1234,56"
              />
              <small class="hint">
                Le montant accepte une virgule ou un point et sera affiche en EUR.
              </small>
              @if (showFieldError('amountInput')) {
                <small>{{ getAmountErrorMessage() }}</small>
              }
            </label>

            <label class="field">
              <span>Date</span>
              <input type="date" formControlName="date" />
              @if (showFieldError('date')) {
                <small>La date est obligatoire.</small>
              }
            </label>
          </div>

          <label class="field">
            <span>Tag optionnel</span>
            <select formControlName="tagId" [disabled]="tagSelectionLocked()">
              <option value="">Sans tag</option>
              @for (tag of tags(); track tag.id) {
                <option [value]="tag.id">{{ tag.name }}</option>
              }
            </select>

            @if (tagsLoading()) {
              <small class="hint">Chargement des tags en cours.</small>
            } @else if (tagLoadError()) {
              <small>{{ tagLoadError() }}</small>
            } @else if (tags().length === 0) {
              <small class="hint">
                Aucun tag depense disponible pour l'instant. Le CRUD reste utilisable sans tag.
              </small>
            } @else {
              <small class="hint">
                Le tag reste facultatif. L'autocomplete partage pourra se brancher plus tard.
              </small>
            }

            @if (editingExpense(); as currentExpense) {
              @if (tagLoadError() && currentExpense.tagName) {
                <small class="hint">Tag actuel conserve: {{ currentExpense.tagName }}</small>
              }
            }
          </label>

          <div class="form-actions">
            <button type="submit" class="primary-button" [disabled]="savePending()">
              {{
                savePending()
                  ? 'Enregistrement...'
                  : editingExpenseId()
                    ? 'Enregistrer les changements'
                    : 'Creer la depense'
              }}
            </button>

            <button
              type="button"
              class="ghost-button"
              (click)="reloadExpenses()"
              [disabled]="listLoading()"
            >
              Actualiser la liste
            </button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="section-heading list-heading">
          <div>
            <p class="section-kicker">Liste</p>
            <h2>Historique des depenses</h2>
          </div>

          <label class="sort-control">
            <span>Trier</span>
            <select
              [value]="sortDirection()"
              (change)="updateSortDirection($any($event.target).value)"
            >
              <option value="desc">Date la plus recente</option>
              <option value="asc">Date la plus ancienne</option>
            </select>
          </label>
        </div>

        @if (listLoading()) {
          <div class="empty-state loading-state">
            <strong>Chargement des depenses...</strong>
            <p>La liste se synchronise avec l'API metier.</p>
          </div>
        } @else if (listError()) {
          <div class="empty-state error-state">
            <strong>Impossible de charger les depenses.</strong>
            <p>{{ listError() }}</p>
            <button type="button" class="secondary-button" (click)="reloadExpenses()">
              Reessayer
            </button>
          </div>
        } @else if (sortedExpenses().length === 0) {
          <div class="empty-state">
            <strong>Aucune depense pour le moment.</strong>
            <p>Creez une premiere ligne pour valider le flux complet de l'ecran.</p>
          </div>
        } @else {
          <div class="expenses-list">
            @for (expense of sortedExpenses(); track expense.id) {
              <article class="expense-row" [class.editing]="expense.id === editingExpenseId()">
                <div class="expense-main">
                  <div class="expense-topline">
                    <h3>{{ expense.name }}</h3>
                    <span class="amount-pill">{{ formatCurrency(expense.amount) }}</span>
                  </div>

                  <div class="expense-meta">
                    <span>{{ formatDate(expense.date) }}</span>
                    <span>{{ expense.tagName ?? 'Sans tag' }}</span>
                  </div>
                </div>

                <div class="expense-actions">
                  <button type="button" class="ghost-button" (click)="startEdit(expense)">
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="danger-button"
                    (click)="deleteExpense(expense)"
                    [disabled]="deletePendingId() === expense.id"
                  >
                    {{ deletePendingId() === expense.id ? 'Suppression...' : 'Supprimer' }}
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
        justify-items: end;
      }

      .eyebrow,
      .section-kicker {
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

      h2,
      h3 {
        margin: 0;
        color: #18202a;
      }

      p {
        margin: 0;
        color: #51606f;
        line-height: 1.6;
      }

      .intro {
        max-width: 46rem;
      }

      .status-pill {
        padding: 0.7rem 1rem;
        border-radius: 999px;
        background: #fff3df;
        color: #8b5a06;
        font-weight: 600;
      }

      .stats-grid,
      .content-grid {
        display: grid;
        gap: 1rem;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-bottom: 1rem;
      }

      .content-grid {
        grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
        align-items: start;
      }

      .card,
      .stat-card {
        border-radius: 1.25rem;
        border: 1px solid #d7dee5;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(24, 32, 42, 0.06);
      }

      .card {
        padding: 1.4rem;
      }

      .stat-card {
        padding: 1.25rem;
      }

      .accent {
        background: #f6f3ec;
      }

      .stat-value {
        display: block;
        color: #18202a;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .stat-label {
        display: block;
        margin-top: 0.35rem;
        color: #51606f;
      }

      .feedback-banner {
        margin-bottom: 1rem;
        padding: 0.95rem 1rem;
        border-radius: 1rem;
        border: 1px solid #cfe0d8;
        background: #edf8f2;
        color: #1f5e3d;
      }

      .feedback-banner.error {
        border-color: #e8c6c2;
        background: #fff1ef;
        color: #9c2f26;
      }

      .section-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: 1.25rem;
      }

      .list-heading {
        align-items: end;
      }

      .expense-form {
        display: grid;
        gap: 1rem;
      }

      .field-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .field,
      .sort-control {
        display: grid;
        gap: 0.4rem;
      }

      .field span,
      .sort-control span {
        color: #364251;
        font-size: 0.9rem;
        font-weight: 600;
      }

      input,
      select,
      button {
        font: inherit;
      }

      input,
      select {
        min-height: 2.9rem;
        width: 100%;
        border-radius: 0.9rem;
        border: 1px solid #c9d3dc;
        background: #ffffff;
        padding: 0 0.9rem;
        color: #18202a;
      }

      input:focus,
      select:focus {
        outline: 2px solid rgba(15, 118, 110, 0.18);
        border-color: #0f766e;
      }

      small {
        color: #b0392b;
        line-height: 1.45;
      }

      .hint {
        color: #607081;
      }

      .form-actions,
      .expense-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .primary-button,
      .secondary-button,
      .ghost-button,
      .danger-button {
        min-height: 2.85rem;
        border-radius: 999px;
        border: none;
        padding: 0 1rem;
        cursor: pointer;
        font-weight: 600;
      }

      .primary-button {
        background: #18202a;
        color: #f7f2ea;
      }

      .secondary-button {
        background: #fff3df;
        color: #8b5a06;
      }

      .ghost-button {
        background: #edf2f6;
        color: #334155;
      }

      .danger-button {
        background: #fff1ef;
        color: #9c2f26;
      }

      button:disabled,
      input:disabled,
      select:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .sort-control {
        min-width: 13rem;
      }

      .empty-state {
        padding: 1.2rem;
        border-radius: 1rem;
        background: #f7fafc;
        border: 1px dashed #cbd5df;
      }

      .loading-state {
        background: #fffaf0;
      }

      .error-state {
        background: #fff5f3;
        border-color: #e6c9c4;
      }

      .expenses-list {
        display: grid;
        gap: 0.85rem;
      }

      .expense-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 1rem;
        align-items: center;
        padding: 1rem;
        border-radius: 1rem;
        border: 1px solid #d7dee5;
        background: #fbfdff;
      }

      .expense-row.editing {
        border-color: #d7a648;
        background: #fff8ec;
      }

      .expense-topline {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        justify-content: space-between;
      }

      .amount-pill {
        display: inline-flex;
        align-items: center;
        min-height: 2.2rem;
        padding: 0 0.8rem;
        border-radius: 999px;
        background: #edf8f2;
        color: #1f5e3d;
        font-weight: 700;
        white-space: nowrap;
      }

      .expense-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 0.5rem;
        color: #607081;
      }

      @media (max-width: 720px) {
        .page-header,
        .section-heading,
        .expense-topline {
          flex-direction: column;
        }

        .header-actions {
          justify-items: start;
        }

        .content-grid,
        .field-row,
        .expense-row {
          grid-template-columns: 1fr;
        }

        .sort-control {
          min-width: 0;
        }
      }
    `
  ]
})
export class ExpensesComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly expenseService = inject(ExpenseService);
  private readonly tagService = inject(TagService);

  readonly expenseForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    amountInput: ['', [Validators.required, expenseAmountValidator]],
    date: [this.getTodayIsoDate(), [Validators.required]],
    tagId: ['']
  });

  readonly expenses = signal<ExpenseDto[]>([]);
  readonly tags = signal<TagDto[]>([]);
  readonly editingExpenseId = signal<string | null>(null);
  readonly listLoading = signal(true);
  readonly savePending = signal(false);
  readonly tagsLoading = signal(true);
  readonly deletePendingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly tagLoadError = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly feedbackMessage = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  readonly editingExpense = computed(() => {
    const expenseId = this.editingExpenseId();
    return this.expenses().find(expense => expense.id === expenseId) ?? null;
  });

  readonly sortedExpenses = computed(() => {
    const direction = this.sortDirection();

    return [...this.expenses()].sort((leftExpense, rightExpense) => {
      const comparison = leftExpense.date.localeCompare(rightExpense.date);
      return direction === 'asc' ? comparison : -comparison;
    });
  });

  readonly totalAmount = computed(() =>
    this.expenses().reduce((total, expense) => total + expense.amount, 0)
  );

  readonly latestExpenseDateLabel = computed(() => {
    const mostRecentExpense = [...this.expenses()].sort((leftExpense, rightExpense) =>
      rightExpense.date.localeCompare(leftExpense.date)
    )[0];

    return mostRecentExpense ? this.formatDate(mostRecentExpense.date) : 'Aucune';
  });

  readonly tagSelectionLocked = computed(() => this.tagsLoading() || this.tagLoadError() !== null);

  ngOnInit(): void {
    this.reloadExpenses();
    this.loadExpenseTags();
  }

  private getTodayIsoDate(): string {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }

  reloadExpenses(): void {
    this.listLoading.set(true);
    this.listError.set(null);

    this.expenseService.getExpenses().subscribe({
      next: expenses => {
        this.expenses.set(expenses);
        this.listLoading.set(false);
      },
      error: error => {
        this.listLoading.set(false);
        this.listError.set(coerceExpenseError(error, 'La liste des depenses est indisponible.'));
      }
    });
  }

  loadExpenseTags(): void {
    this.tagsLoading.set(true);
    this.tagLoadError.set(null);

    this.tagService.getTags(TagCategory.Expense).subscribe({
      next: tags => {
        this.tags.set(tags);
        this.tagsLoading.set(false);
      },
      error: error => {
        this.tags.set([]);
        this.tagsLoading.set(false);
        this.tagLoadError.set(
          coerceExpenseError(
            error,
            'Les tags depense ne sont pas disponibles. Vous pouvez continuer sans tag.'
          )
        );
      }
    });
  }

  startCreate(): void {
    this.editingExpenseId.set(null);
    this.expenseForm.reset({
      name: '',
      amountInput: '',
      date: this.getTodayIsoDate(),
      tagId: ''
    });
    this.expenseForm.markAsPristine();
    this.expenseForm.markAsUntouched();
  }

  startEdit(expense: ExpenseDto): void {
    this.editingExpenseId.set(expense.id);
    this.feedbackMessage.set(null);
    this.expenseForm.reset({
      name: expense.name,
      amountInput: formatExpenseAmountInput(expense.amount),
      date: expense.date,
      tagId: expense.tagId ?? ''
    });
    this.expenseForm.markAsPristine();
    this.expenseForm.markAsUntouched();
  }

  submitExpense(): void {
    if (this.expenseForm.invalid) {
      this.feedbackMessage.set({
        type: 'error',
        message: 'Le formulaire contient des champs invalides. Corrigez-les avant de continuer.'
      });
      this.expenseForm.markAllAsTouched();
      return;
    }

    const formValue = this.expenseForm.getRawValue();
    const amount = normalizeExpenseAmount(formValue.amountInput);
    if (amount === null || amount <= 0) {
      this.feedbackMessage.set({
        type: 'error',
        message: 'Le montant saisi est invalide.'
      });
      return;
    }

    this.savePending.set(true);
    this.feedbackMessage.set(null);

    const selectedTagId = formValue.tagId || null;
    const currentExpenseId = this.editingExpenseId();

    if (currentExpenseId) {
      const request: UpdateExpenseRequest = {
        name: formValue.name.trim(),
        amount,
        date: formValue.date
      };

      if (!this.tagSelectionLocked()) {
        request.tagId = selectedTagId;
      }

      this.expenseService.updateExpense(currentExpenseId, request).subscribe({
        next: () => {
          this.savePending.set(false);
          this.startCreate();
          this.feedbackMessage.set({ type: 'success', message: 'La depense a ete mise a jour.' });
          this.reloadExpenses();
        },
        error: error => {
          this.savePending.set(false);
          this.feedbackMessage.set({
            type: 'error',
            message: coerceExpenseError(error, 'La mise a jour de la depense a echoue.')
          });
        }
      });

      return;
    }

    const request: CreateExpenseRequest = {
      name: formValue.name.trim(),
      amount,
      date: formValue.date,
      tagId: selectedTagId
    };

    this.expenseService.createExpense(request).subscribe({
      next: () => {
        this.savePending.set(false);
        this.startCreate();
        this.feedbackMessage.set({ type: 'success', message: 'La depense a ete creee.' });
        this.reloadExpenses();
      },
      error: error => {
        this.savePending.set(false);
        this.feedbackMessage.set({
          type: 'error',
          message: coerceExpenseError(error, 'La creation de la depense a echoue.')
        });
      }
    });
  }

  deleteExpense(expense: ExpenseDto): void {
    const confirmed = window.confirm(
      `Supprimer la depense "${expense.name}" du ${this.formatDate(expense.date)} ?`
    );

    if (!confirmed) {
      return;
    }

    this.deletePendingId.set(expense.id);
    this.feedbackMessage.set(null);

    this.expenseService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.deletePendingId.set(null);

        if (this.editingExpenseId() === expense.id) {
          this.startCreate();
        }

        this.feedbackMessage.set({ type: 'success', message: 'La depense a ete supprimee.' });
        this.reloadExpenses();
      },
      error: error => {
        this.deletePendingId.set(null);
        this.feedbackMessage.set({
          type: 'error',
          message: coerceExpenseError(error, 'La suppression de la depense a echoue.')
        });
      }
    });
  }

  updateSortDirection(value: 'asc' | 'desc'): void {
    this.sortDirection.set(value);
  }

  showFieldError(controlName: 'name' | 'amountInput' | 'date'): boolean {
    const control = this.expenseForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  getNameErrorMessage(): string {
    const control = this.expenseForm.controls.name;

    if (control.hasError('required')) {
      return 'Le libelle est obligatoire.';
    }

    if (control.hasError('maxlength')) {
      return 'Le libelle ne peut pas depasser 200 caracteres.';
    }

    return 'Le libelle est invalide.';
  }

  getAmountErrorMessage(): string {
    const control = this.expenseForm.controls.amountInput;

    if (control.hasError('required')) {
      return 'Le montant est obligatoire.';
    }

    if (control.hasError('minAmount')) {
      return 'Le montant doit etre strictement positif.';
    }

    return 'Saisissez un montant avec 2 decimales maximum.';
  }

  formatCurrency(value: number): string {
    return expenseCurrencyFormatter.format(value);
  }

  formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(part => Number(part));
    return expenseDateFormatter.format(new Date(year, month - 1, day));
  }
}
