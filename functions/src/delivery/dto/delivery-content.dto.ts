export interface DeliveryContentResponse {
  settingId: string;
  categoryName: string;
  content: string;
  query: string;
  generatedAt: Date;
  success: boolean;
  error?: string;
}

export interface BatchDeliveryResponse {
  contents: DeliveryContentResponse[];
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ settingId: string; categoryName: string; error: string }>;
  generatedAt: Date;
}