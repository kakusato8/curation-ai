import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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

export interface DeliveryLog {
  userId: string;
  settingId?: string;
  deliveryType: 'scheduled' | 'instant';
  status: 'success' | 'failed';
  errorMessage?: string;
  deliveredAt: string;
  contentSummary?: string;
}

export interface DeliveryContentResponse {
  settingId: string;
  categoryName: string;
  content: string;
  query: string;
  generatedAt: string;
  success: boolean;
  error?: string;
}

export interface BatchDeliveryResponse {
  contents: DeliveryContentResponse[];
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ settingId: string; categoryName: string; error: string }>;
  generatedAt: string;
}

class ApiClient {
  private async getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Settings API
  async getSettings(): Promise<UserSettings> {
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

  // New content delivery methods
  async instantContentDelivery(settingId: string): Promise<DeliveryContentResponse> {
    return this.request<DeliveryContentResponse>(`/delivery/content/${settingId}`, {
      method: 'POST',
    });
  }

  async instantContentDeliveryAll(): Promise<BatchDeliveryResponse> {
    return this.request<BatchDeliveryResponse>('/delivery/content/all', {
      method: 'POST',
    });
  }

  // Auth API
  async registerUser(uid: string, email: string): Promise<any> {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ uid, email }),
    });
  }
}

export const apiClient = new ApiClient();