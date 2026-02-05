import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDto {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  recentSignups: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/v1/admin`;

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: string, role: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }
}
