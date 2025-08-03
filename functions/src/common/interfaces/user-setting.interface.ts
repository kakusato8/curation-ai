export interface UserSetting {
  id: string;
  categoryName: string;
  geminiQuery: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  weeklyDay?: number; // 0:日曜, 1:月曜...
  monthlyDay?: number; // 1-31
}

export interface UserSettings {
  userId: string;
  settings: UserSetting[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryLog {
  userId: string;
  settingId?: string;
  deliveryType: 'scheduled' | 'instant';
  status: 'success' | 'failed';
  errorMessage?: string;
  deliveredAt: Date;
  contentSummary?: string;
}