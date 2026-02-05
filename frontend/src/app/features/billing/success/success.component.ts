import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-billing-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="success-container">
      <div class="success-card">
        <div class="success-icon">*</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for subscribing. Your account has been upgraded.</p>
        <a routerLink="/dashboard" class="btn">Go to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: #f5f5f5;
    }
    .success-card {
      text-align: center;
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      max-width: 400px;
    }
    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 1rem;
      font-size: 1.5rem;
    }
    p {
      color: #666;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-block;
      background: #000;
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
    }
    .btn:hover {
      background: #333;
    }
  `]
})
export class BillingSuccessComponent {}
