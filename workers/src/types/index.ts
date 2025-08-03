export interface Env {
  CURATION_DB: KVNamespace;
  GEMINI_API_KEY: string;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

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

export interface JWTPayload {
  uid: string;
  email: string;
  iat: number;
  exp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}