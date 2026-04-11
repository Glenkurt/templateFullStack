import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RevenueDto {
  id: string;
  amount: number;
  date: string;
  tagId: string | null;
  tagName: string | null;
  clientId: string | null;
  clientName: string | null;
  createdAt: string;
}

export interface CreateRevenueRequest {
  amount: number;
  date: string;
  tagId?: string | null;
  clientId?: string | null;
}

export interface UpdateRevenueRequest {
  amount?: number | null;
  date?: string | null;
  tagId?: string | null;
  clientId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RevenueService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/revenues`;

  getRevenues(): Observable<RevenueDto[]> {
    return this.http.get<RevenueDto[]>(this.apiUrl);
  }

  getRevenue(id: string): Observable<RevenueDto> {
    return this.http.get<RevenueDto>(`${this.apiUrl}/${id}`);
  }

  createRevenue(request: CreateRevenueRequest): Observable<RevenueDto> {
    return this.http.post<RevenueDto>(this.apiUrl, request);
  }

  updateRevenue(id: string, request: UpdateRevenueRequest): Observable<RevenueDto> {
    return this.http.patch<RevenueDto>(`${this.apiUrl}/${id}`, request);
  }

  deleteRevenue(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}