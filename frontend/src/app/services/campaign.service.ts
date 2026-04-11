import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CampaignStatus } from './domain.models';

export interface CampaignDto {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  startDate: string;
  endDate: string | null;
  status: CampaignStatus;
  clientId: string;
  clientName: string | null;
  createdAt: string;
}

export interface CreateCampaignRequest {
  title: string;
  description?: string | null;
  amount: number;
  startDate: string;
  endDate?: string | null;
  status: CampaignStatus;
  clientId: string;
}

export interface UpdateCampaignRequest {
  title?: string | null;
  description?: string | null;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: CampaignStatus | null;
  clientId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/campaigns`;

  getCampaigns(): Observable<CampaignDto[]> {
    return this.http.get<CampaignDto[]>(this.apiUrl);
  }

  getCampaign(id: string): Observable<CampaignDto> {
    return this.http.get<CampaignDto>(`${this.apiUrl}/${id}`);
  }

  createCampaign(request: CreateCampaignRequest): Observable<CampaignDto> {
    return this.http.post<CampaignDto>(this.apiUrl, request);
  }

  updateCampaign(id: string, request: UpdateCampaignRequest): Observable<CampaignDto> {
    return this.http.patch<CampaignDto>(`${this.apiUrl}/${id}`, request);
  }

  deleteCampaign(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}