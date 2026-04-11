/**
 * Shared module barrel export.
 *
 * The shared module contains reusable components, directives, and pipes
 * that are used across multiple features.
 *
 * TODO: Add shared components as the application grows:
 * - Loading spinner
 * - Error message display
 * - Confirmation dialog
 * - Form validation messages
 * - Pagination component
 */

// Components
export { AppShellComponent } from './layout/app-shell.component';
export { TagAutocompleteComponent } from './components/tag-autocomplete/tag-autocomplete.component';

// Directives
// export { HighlightDirective } from './directives/highlight.directive';

// Pipes
// export { TruncatePipe } from './pipes/truncate.pipe';

// Navigation
export { BUSINESS_NAV_ITEMS, type BusinessNavItem } from './navigation/business-navigation';
