import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Forgot Password</h1>

        @if (submitted()) {
          <div class="success-message">
            <p>If an account exists with this email, you will receive a password reset link.</p>
            <a routerLink="/auth/login">Back to login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="you@example.com"
              >
            </div>

            @if (error()) {
              <div class="error">{{ error() }}</div>
            }

            <button type="submit" [disabled]="loading() || form.invalid">
              {{ loading() ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </form>

          <p class="auth-link">
            Remember your password? <a routerLink="/auth/login">Login</a>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: #f5f5f5;
    }

    .auth-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;

      h1 {
        margin: 0 0 1.5rem;
        font-size: 1.5rem;
      }
    }

    .form-group {
      margin-bottom: 1rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
      }

      input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        box-sizing: border-box;

        &:focus {
          outline: none;
          border-color: #000;
        }
      }
    }

    button[type="submit"] {
      width: 100%;
      padding: 0.75rem;
      background: #000;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #333;
      }
    }

    .error {
      background: #fee;
      color: #c00;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .success-message {
      text-align: center;

      p {
        margin-bottom: 1rem;
        color: #444;
      }

      a {
        color: #000;
        font-weight: 500;
      }
    }

    .auth-link {
      margin-top: 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: #666;

      a {
        color: #000;
        font-weight: 500;
      }
    }
  `]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.http.post(`${environment.apiBaseUrl}/v1/auth/forgot-password`, {
      email: this.form.value.email
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('An error occurred. Please try again.');
      }
    });
  }
}
