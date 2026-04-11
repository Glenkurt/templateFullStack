import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TagCategory } from './domain.models';

export interface TagDto {
  id: string;
  name: string;
  category: TagCategory;
  createdAt: string;
}

export interface CreateTagRequest {
  name: string;
  category: TagCategory;
}

export interface UpdateTagRequest {
  name?: string | null;
  category?: TagCategory | null;
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/v1/tags`;

  getTags(category?: TagCategory): Observable<TagDto[]> {
    const params = category === undefined
      ? undefined
      : new HttpParams().set('category', category.toString());

    return this.http.get<TagDto[]>(this.apiUrl, { params });
  }

  getTag(id: string): Observable<TagDto> {
    return this.http.get<TagDto>(`${this.apiUrl}/${id}`);
  }

  createTag(request: CreateTagRequest): Observable<TagDto> {
    return this.http.post<TagDto>(this.apiUrl, request);
  }

  updateTag(id: string, request: UpdateTagRequest): Observable<TagDto> {
    return this.http.patch<TagDto>(`${this.apiUrl}/${id}`, request);
  }

  deleteTag(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}