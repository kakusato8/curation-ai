const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api';

export interface UserSetting {
  id: string;
  categoryName: string;
  geminiQuery: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  weeklyDay?: number;
  monthlyDay?: number;
}

export interface UserSettings {
  userId: string;
  settings: UserSetting[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  uid: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryLog {
  userId: string;
  settingId?: string;
  deliveryType: 'scheduled' | 'instant';
  status: 'success' | 'failed';
  errorMessage?: string;
  deliveredAt: string;
  contentSummary?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private removeAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API request failed: ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data.data;
  }

  // Auth API
  async register(uid: string, email: string): Promise<{ user: User; token: string }> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error);
    }

    this.setAuthToken(data.data.token);
    return data.data;
  }

  async login(uid: string, email: string): Promise<{ user: User; token: string }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error);
    }

    this.setAuthToken(data.data.token);
    return data.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.removeAuthToken();
    }
  }

  // Settings API
  async getSettings(): Promise<UserSettings | null> {
    return this.request<UserSettings>('/settings');
  }

  async createSetting(setting: Omit<UserSetting, 'id'>): Promise<UserSetting> {
    return this.request<UserSetting>('/settings', {
      method: 'POST',
      body: JSON.stringify(setting),
    });
  }

  async updateSetting(id: string, setting: Partial<Omit<UserSetting, 'id'>>): Promise<UserSetting> {
    return this.request<UserSetting>(`/settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(setting),
    });
  }

  async deleteSetting(id: string): Promise<void> {
    return this.request<void>(`/settings/${id}`, {
      method: 'DELETE',
    });
  }

  // Delivery API
  async instantDelivery(settingId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/delivery/instant/${settingId}`, {
      method: 'POST',
    });
  }

  async instantDeliveryAll(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/delivery/instant/all', {
      method: 'POST',
    });
  }

  async getDeliveryLogs(): Promise<{ logs: DeliveryLog[] }> {
    return this.request<{ logs: DeliveryLog[] }>('/delivery/logs');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Decode JWT token (simplified)
  getCurrentUser(): { uid: string; email: string } | null {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { uid: payload.uid, email: payload.email };
    } catch {
      this.removeAuthToken();
      return null;
    }
  }
}

export const apiClient = new ApiClient();