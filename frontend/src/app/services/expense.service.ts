import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExpenseDto {
  id: string;
  name: string;
  amount: number;
  date: string;
  tagId: string | null;
  tagName: string | null;
  createdAt: string;
}

export interface CreateExpenseRequest {
  name: string;
  amount: number;
  date: string;
  tagId?: string | null;
}

export interface UpdateExpenseRequest {
  name?: string | null;
  amount?: number | null;
  date?: string | null;
  tagId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/expenses`;

  getExpenses(): Observable<ExpenseDto[]> {
    return this.http.get<ExpenseDto[]>(this.apiUrl);
  }

  getExpense(id: string): Observable<ExpenseDto> {
    return this.http.get<ExpenseDto>(`${this.apiUrl}/${id}`);
  }

  createExpense(request: CreateExpenseRequest): Observable<ExpenseDto> {
    return this.http.post<ExpenseDto>(this.apiUrl, request);
  }

  updateExpense(id: string, request: UpdateExpenseRequest): Observable<ExpenseDto> {
    return this.http.patch<ExpenseDto>(`${this.apiUrl}/${id}`, request);
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}