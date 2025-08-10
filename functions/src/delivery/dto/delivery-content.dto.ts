export interface DeliveryContentResponse {
  settingId: string;
  categoryName: string;
  content: string;
  query: string;
  generatedAt: Date;
  success: boolean;
  error?: string;
  // AI処理情報
  modelUsed?: string;
  searchExecuted?: boolean;
  processingTimestamp?: string;
}

export interface BatchDeliveryResponse {
  contents: DeliveryContentResponse[];
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ settingId: string; categoryName: string; error: string }>;
  generatedAt: Date;
}