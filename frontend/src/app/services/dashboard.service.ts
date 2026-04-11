import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CampaignStatus } from './domain.models';

export interface DashboardSummaryDto {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  totalClients: number;
  activeCampaigns: number;
}

export interface MonthlyFinancePointDto {
  year: number;
  month: number;
  revenue: number;
  expense: number;
}

export interface ActiveCampaignDto {
  id: string;
  title: string;
  amount: number;
  startDate: string;
  endDate: string | null;
  status: CampaignStatus;
  clientId: string;
  clientName: string | null;
}

export interface RecentClientDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export interface DashboardOverviewDto {
  summary: DashboardSummaryDto;
  monthlyFinance: MonthlyFinancePointDto[];
  activeCampaigns: ActiveCampaignDto[];
  recentClients: RecentClientDto[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/dashboard`;

  getSummary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(`${this.apiUrl}/summary`);
  }

  getOverview(): Observable<DashboardOverviewDto> {
    return this.http.get<DashboardOverviewDto>(`${this.apiUrl}/overview`);
  }
}