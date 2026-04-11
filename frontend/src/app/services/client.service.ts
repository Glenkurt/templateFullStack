import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  createdAt: string;
}

export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
}

export interface UpdateClientRequest {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/clients`;

  getClients(): Observable<ClientDto[]> {
    return this.http.get<ClientDto[]>(this.apiUrl);
  }

  getClient(id: string): Observable<ClientDto> {
    return this.http.get<ClientDto>(`${this.apiUrl}/${id}`);
  }

  createClient(request: CreateClientRequest): Observable<ClientDto> {
    return this.http.post<ClientDto>(this.apiUrl, request);
  }

  updateClient(id: string, request: UpdateClientRequest): Observable<ClientDto> {
    return this.http.patch<ClientDto>(`${this.apiUrl}/${id}`, request);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}