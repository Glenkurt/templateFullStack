export enum TagCategory {
  Expense = 0,
  Revenue = 1
}

export enum CampaignStatus {
  Draft = 'Draft',
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface ApiProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface ApiErrorResponse {
  status: number;
  message: string;
  originalError?: {
    error?: ApiProblemDetails | unknown;
  };
}