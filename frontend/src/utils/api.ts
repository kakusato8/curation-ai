import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface UserSetting {
  id: string;
  categoryName: string;
  geminiQuery: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  weeklyDay?: number;
  monthlyDay?: number;
  displayOrder?: number;
}

export interface UserSettings {
  userId: string;
  settings: UserSetting[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryLog {
  id?: string;
  userId: string;
  settingId?: string;
  categoryName?: string;
  geminiQuery?: string;
  deliveryType: 'scheduled' | 'instant';
  status: 'success' | 'failed';
  errorMessage?: string;
  deliveredAt: string;
  contentSummary?: string;
  fullContent?: string;
  recipientEmail?: string;
  generatedAt?: string;
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

export interface ContentArchiveResponse {
  logs: DeliveryLog[];
  totalCount: number;
  categories: string[];
}

export interface DeliveryLogsFilters {
  limit?: number;
  status?: 'success' | 'failed';
  deliveryType?: 'scheduled' | 'instant';
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
  categoryName?: string;
  sortBy?: 'deliveredAt' | 'generatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContentArchiveFilters {
  limit?: number;
  categoryName?: string;
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
  sortBy?: 'deliveredAt' | 'generatedAt' | 'categoryName';
  sortOrder?: 'asc' | 'desc';
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

  async reorderSettings(settingIds: string[]): Promise<UserSettings> {
    return this.request<UserSettings>('/settings/reorder', {
      method: 'PUT',
      body: JSON.stringify({ settingIds }),
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

  async getDeliveryLogs(filters?: DeliveryLogsFilters): Promise<{ logs: DeliveryLog[] }> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.deliveryType) params.append('deliveryType', filters.deliveryType);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.searchText) params.append('searchText', filters.searchText);
      if (filters.categoryName) params.append('categoryName', filters.categoryName);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }
    
    const queryString = params.toString();
    return this.request<{ logs: DeliveryLog[] }>(`/delivery/logs${queryString ? '?' + queryString : ''}`);
  }

  async getDeliveryLogDetail(logId: string): Promise<{ log: DeliveryLog }> {
    return this.request<{ log: DeliveryLog }>(`/delivery/logs/${logId}`);
  }

  async getDeliveryHistory(categoryName: string, limit?: number): Promise<{ history: DeliveryLog[] }> {
    const queryParam = limit ? `?limit=${limit}` : '';
    return this.request<{ history: DeliveryLog[] }>(`/delivery/history/${encodeURIComponent(categoryName)}${queryParam}`);
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

  // Content archive methods
  async getContentArchive(filters?: ContentArchiveFilters, forceRefresh?: boolean): Promise<ContentArchiveResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.categoryName) params.append('categoryName', filters.categoryName);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.searchText) params.append('searchText', filters.searchText);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }
    
    // Add cache bust parameter for force refresh
    if (forceRefresh) {
      params.append('_t', Date.now().toString());
    }
    
    const queryString = params.toString();
    const requestOptions: RequestInit = {};
    
    // Add cache control headers for force refresh
    if (forceRefresh) {
      requestOptions.headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }
    
    return this.request<ContentArchiveResponse>(`/delivery/archive${queryString ? '?' + queryString : ''}`, requestOptions);
  }

  // Delete content methods
  async deleteDeliveryLog(logId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/delivery/logs/${logId}`, {
      method: 'DELETE',
    });
  }

  async batchDeleteDeliveryLogs(logIds: string[]): Promise<{
    message: string;
    successful: number;
    failed: number;
    deletedIds: string[];
    errors?: Array<{ logId: string; error: string }>;
  }> {
    console.log('=== API CLIENT BATCH DELETE START ===');
    console.log('Sending logIds to API:', logIds);
    
    const result = await this.request<{
      message: string;
      successful: number;
      failed: number;
      deletedIds: string[];
      errors?: Array<{ logId: string; error: string }>;
    }>('/delivery/logs/batch', {
      method: 'DELETE',
      body: JSON.stringify({ logIds }),
    });
    
    console.log('API response received:', result);
    console.log('=== API CLIENT BATCH DELETE END ===');
    return result;
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