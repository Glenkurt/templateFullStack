import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  forwardRef,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TagCategory } from '../../../services/domain.models';
import { TagDto, TagService } from '../../../services/tag.service';

@Component({
  selector: 'app-tag-autocomplete',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagAutocompleteComponent),
      multi: true
    }
  ],
  template: `
    <div class="tag-field" [class.disabled]="disabled">
      <div class="field-header">
        <label class="field-label" [attr.for]="inputId">{{ label }}</label>
        @if (selectedTag(); as selectedTag) {
          <button
            type="button"
            class="clear-button"
            (click)="clearSelection()"
            [disabled]="disabled"
          >
            Retirer
          </button>
        }
      </div>

      <div class="input-shell" [class.open]="dropdownOpen()" [class.loading]="loading()">
        <input
          [id]="inputId"
          type="text"
          class="tag-input"
          [value]="searchTerm()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [attr.aria-expanded]="dropdownOpen()"
          [attr.aria-controls]="optionsId"
          [attr.aria-label]="label"
          autocomplete="off"
          (focus)="openDropdown()"
          (blur)="handleBlur()"
          (input)="handleInput($event)"
        >

        @if (loading()) {
          <span class="status-text">Chargement...</span>
        } @else if (creating()) {
          <span class="status-text">Creation...</span>
        }
      </div>

      @if (dropdownOpen()) {
        <div class="options-panel" [id]="optionsId">
          @if (errorMessage(); as errorMessage) {
            <p class="panel-message error">{{ errorMessage }}</p>
          }

          @if (!loading() && filteredTags().length > 0) {
            <div class="option-list">
              @for (tag of filteredTags(); track tag.id) {
                <button
                  type="button"
                  class="option"
                  [class.active]="tag.id === value()"
                  (mousedown)="selectTag(tag, $event)"
                >
                  <span>{{ tag.name }}</span>
                  @if (tag.id === value()) {
                    <strong>Selectionne</strong>
                  }
                </button>
              }
            </div>
          } @else if (!loading() && normalizedSearchTerm()) {
            <p class="panel-message">Aucun tag trouve pour cette categorie.</p>
          } @else if (!loading()) {
            <p class="panel-message">Commencez a saisir pour filtrer les tags.</p>
          }

          @if (canCreateTag()) {
            <button
              type="button"
              class="create-button"
              (mousedown)="createTag($event)"
              [disabled]="creating() || disabled"
            >
              Creer "{{ createCandidateName() }}"
            </button>
          }
        </div>
      }

      @if (selectedTag(); as selectedTag) {
        <p class="selection-hint">Tag actif : {{ selectedTag.name }}</p>
      } @else {
        <p class="selection-hint muted">Aucun tag selectionne.</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .tag-field {
        position: relative;
        display: grid;
        gap: 0.5rem;
      }

      .tag-field.disabled {
        opacity: 0.7;
      }

      .field-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .field-label {
        font-size: 0.9rem;
        font-weight: 700;
        color: #18202a;
      }

      .clear-button {
        border: none;
        background: transparent;
        color: #0f766e;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
      }

      .input-shell {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-height: 3rem;
        padding: 0.3rem 0.85rem;
        border-radius: 1rem;
        border: 1px solid #cbd5df;
        background: #ffffff;
      }

      .input-shell.open {
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
      }

      .input-shell.loading {
        background: #f8fbfb;
      }

      .tag-input {
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        color: #18202a;
        font: inherit;
      }

      .tag-input::placeholder {
        color: #7b8793;
      }

      .status-text {
        color: #607081;
        font-size: 0.82rem;
        white-space: nowrap;
      }

      .options-panel {
        position: absolute;
        top: calc(100% + 0.35rem);
        left: 0;
        right: 0;
        z-index: 10;
        padding: 0.5rem;
        border-radius: 1rem;
        border: 1px solid #d7dee5;
        background: #ffffff;
        box-shadow: 0 18px 40px rgba(24, 32, 42, 0.14);
      }

      .option-list {
        display: grid;
        gap: 0.35rem;
        max-height: 15rem;
        overflow: auto;
      }

      .option,
      .create-button {
        width: 100%;
        border: none;
        cursor: pointer;
        font: inherit;
      }

      .option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.8rem 0.9rem;
        border-radius: 0.85rem;
        background: #f7fafc;
        color: #18202a;
        text-align: left;
      }

      .option.active {
        background: #e6f4f1;
        color: #0f766e;
      }

      .option strong {
        font-size: 0.78rem;
      }

      .create-button {
        margin-top: 0.5rem;
        padding: 0.85rem 0.9rem;
        border-radius: 0.85rem;
        background: #18202a;
        color: #f7f2ea;
        text-align: left;
      }

      .panel-message {
        margin: 0;
        padding: 0.8rem 0.9rem;
        color: #607081;
      }

      .panel-message.error {
        color: #b42318;
      }

      .selection-hint {
        margin: 0;
        color: #51606f;
        font-size: 0.85rem;
      }

      .selection-hint.muted {
        color: #7b8793;
      }
    `
  ]
})
export class TagAutocompleteComponent implements ControlValueAccessor, OnChanges {
  private readonly tagService = inject(TagService);

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private blurTimeout: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true }) category!: TagCategory;
  @Input() label = 'Tag';
  @Input() placeholder = 'Rechercher ou creer un tag';
  @Output() readonly tagSelected = new EventEmitter<TagDto | null>();

  readonly inputId = `tag-autocomplete-${Math.random().toString(36).slice(2)}`;
  readonly optionsId = `${this.inputId}-options`;
  readonly tags = signal<TagDto[]>([]);
  readonly value = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly dropdownOpen = signal(false);
  readonly errorMessage = signal<string | null>(null);
  disabled = false;

  readonly normalizedSearchTerm = computed(() => this.searchTerm().trim().toLowerCase());
  readonly selectedTag = computed(
    () => this.tags().find(tag => tag.id === this.value()) ?? null
  );
  readonly filteredTags = computed(() => {
    const normalizedSearchTerm = this.normalizedSearchTerm();
    const tags = this.tags();

    if (!normalizedSearchTerm) {
      return tags;
    }

    return tags.filter(tag => tag.name.toLowerCase().includes(normalizedSearchTerm));
  });
  readonly exactMatch = computed(
    () =>
      this.tags().find(tag => tag.name.trim().toLowerCase() === this.normalizedSearchTerm()) ?? null
  );
  readonly createCandidateName = computed(() => this.searchTerm().trim());
  readonly canCreateTag = computed(
    () =>
      !this.disabled &&
      !this.loading() &&
      !this.creating() &&
      this.createCandidateName().length > 0 &&
      this.exactMatch() === null
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['category']) {
      return;
    }

    if (changes['category'].firstChange) {
      this.loadTags();
      return;
    }

    this.resetValueForCategoryChange();
    this.loadTags();
  }

  writeValue(value: string | null): void {
    this.value.set(value);
    this.syncSearchFromSelection();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.dropdownOpen.set(false);
    }
  }

  openDropdown(): void {
    if (this.disabled) {
      return;
    }

    this.clearBlurTimeout();
    this.dropdownOpen.set(true);
    this.errorMessage.set(null);
  }

  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nextSearchTerm = input.value;

    this.searchTerm.set(nextSearchTerm);
    this.dropdownOpen.set(true);
    this.errorMessage.set(null);

    if (!this.selectedTag() || this.selectedTag()?.name === nextSearchTerm.trim()) {
      return;
    }

    this.propagateValue(null);
  }

  handleBlur(): void {
    this.clearBlurTimeout();
    this.blurTimeout = setTimeout(() => {
      this.onTouched();
      this.dropdownOpen.set(false);

      const exactMatch = this.exactMatch();
      if (exactMatch) {
        this.applySelection(exactMatch);
        return;
      }

      this.syncSearchFromSelection();
    }, 120);
  }

  selectTag(tag: TagDto, event: MouseEvent): void {
    event.preventDefault();
    this.clearBlurTimeout();
    this.applySelection(tag);
    this.dropdownOpen.set(false);
  }

  clearSelection(emitChange = true): void {
    this.clearBlurTimeout();
    this.searchTerm.set('');
    this.errorMessage.set(null);
    this.dropdownOpen.set(false);

    if (emitChange) {
      this.propagateValue(null);
    } else {
      this.value.set(null);
      this.tagSelected.emit(null);
    }
  }

  createTag(event: MouseEvent): void {
    event.preventDefault();

    const exactMatch = this.exactMatch();
    if (exactMatch) {
      this.applySelection(exactMatch);
      this.dropdownOpen.set(false);
      return;
    }

    const createCandidateName = this.createCandidateName();
    if (!createCandidateName) {
      return;
    }

    this.creating.set(true);
    this.errorMessage.set(null);

    this.tagService.createTag({ name: createCandidateName, category: this.category }).subscribe({
      next: createdTag => {
        this.creating.set(false);
        this.loadTags(createdTag.id);
      },
      error: error => {
        this.creating.set(false);

        const matchingExistingTag = this.tags().find(
          tag => tag.name.trim().toLowerCase() === createCandidateName.toLowerCase()
        );

        if (matchingExistingTag) {
          this.applySelection(matchingExistingTag);
          this.dropdownOpen.set(false);
          return;
        }

        this.errorMessage.set(this.extractErrorMessage(error));
        this.loadTags(undefined, createCandidateName);
      }
    });
  }

  private loadTags(preferredTagId?: string, preferredTagName?: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tagService.getTags(this.category).subscribe({
      next: tags => {
        const orderedTags = [...tags]
          .filter(tag => tag.category === this.category)
          .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

        this.tags.set(orderedTags);
        this.loading.set(false);

        if (preferredTagId) {
          const preferredTag = orderedTags.find(tag => tag.id === preferredTagId);
          if (preferredTag) {
            this.applySelection(preferredTag);
            this.dropdownOpen.set(false);
            return;
          }
        }

        if (preferredTagName) {
          const preferredTag = orderedTags.find(
            tag => tag.name.trim().toLowerCase() === preferredTagName.trim().toLowerCase()
          );
          if (preferredTag) {
            this.applySelection(preferredTag);
            this.dropdownOpen.set(false);
            return;
          }
        }

        this.syncSearchFromSelection();
      },
      error: error => {
        this.loading.set(false);
        this.tags.set([]);
        this.errorMessage.set(this.extractErrorMessage(error));
      }
    });
  }

  private applySelection(tag: TagDto): void {
    this.searchTerm.set(tag.name);
    this.propagateValue(tag.id, tag);
  }

  private propagateValue(value: string | null, selectedTag?: TagDto | null): void {
    this.value.set(value);
    this.onChange(value);
    this.tagSelected.emit(selectedTag ?? this.selectedTag());
  }

  private resetValueForCategoryChange(): void {
    if (this.value() === null && !this.searchTerm()) {
      return;
    }

    this.clearSelection();
  }

  private syncSearchFromSelection(): void {
    this.searchTerm.set(this.selectedTag()?.name ?? '');
  }

  private extractErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'Impossible de charger ou creer les tags.';
  }

  private clearBlurTimeout(): void {
    if (this.blurTimeout !== null) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
  }
}