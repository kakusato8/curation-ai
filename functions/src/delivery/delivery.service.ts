import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SettingsService } from '../settings/settings.service';
import { GeminiService } from '../gemini/gemini.service';
import { UserSettings, UserSetting, DeliveryLog } from '../common/interfaces/user-setting.interface';
import { DeliveryContentResponse, BatchDeliveryResponse } from './dto/delivery-content.dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private firebaseService: FirebaseService,
    private settingsService: SettingsService,
    private geminiService: GeminiService,
  ) {}

  async handleScheduledDelivery(): Promise<void> {
    this.logger.log('Starting scheduled delivery check...');
    
    const firestore = this.firebaseService.getFirestore();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate();

    try {
      // Get all user settings
      const settingsSnapshot = await firestore.collection('user_settings').get();
      
      for (const doc of settingsSnapshot.docs) {
        const userSettings = doc.data() as UserSettings;
        const userId = userSettings.userId;

        // Get user email
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          this.logger.warn(`User ${userId} not found`);
          continue;
        }
        const userEmail = userDoc.data()?.email;

        // Check each setting for delivery
        for (const setting of userSettings.settings) {
          if (this.shouldDeliver(setting, dayOfWeek, dayOfMonth)) {
            await this.deliverContent(userId, userEmail, setting, 'scheduled');
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in scheduled delivery: ${errorMessage}`);
    }
  }

  private shouldDeliver(setting: UserSetting, dayOfWeek: number, dayOfMonth: number): boolean {
    switch (setting.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return setting.weeklyDay === dayOfWeek;
      case 'monthly':
        return setting.monthlyDay === dayOfMonth;
      default:
        return false;
    }
  }

  async instantDelivery(userId: string, settingId?: string): Promise<void> {
    const userSettings = await this.settingsService.getUserSettings(userId);
    if (!userSettings) {
      throw new Error('User settings not found');
    }

    // Get user email
    const firestore = this.firebaseService.getFirestore();
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    const userEmail = userDoc.data()?.email;

    if (settingId) {
      // Deliver specific setting
      const setting = userSettings.settings.find(s => s.id === settingId);
      if (!setting) {
        throw new Error('Setting not found');
      }
      await this.deliverContent(userId, userEmail, setting, 'instant');
    } else {
      // Deliver all settings
      for (const setting of userSettings.settings) {
        await this.deliverContent(userId, userEmail, setting, 'instant');
      }
    }
  }

  private async deliverContent(
    userId: string,
    userEmail: string,
    setting: UserSetting,
    deliveryType: 'scheduled' | 'instant',
  ): Promise<void> {
    const logEntry: Partial<DeliveryLog> = {
      userId,
      settingId: setting.id,
      deliveryType,
      deliveredAt: new Date(),
    };

    try {
      this.logger.log(`Generating content for ${setting.categoryName} (user: ${userId})`);
      
      // Generate content using Gemini
      const content = await this.geminiService.generateContent(setting.geminiQuery);
      
      // Note: Email sending removed - content is now delivered via in-app display

      logEntry.status = 'success';
      logEntry.contentSummary = content.substring(0, 100) + '...';
      
      this.logger.log(`Successfully delivered ${setting.categoryName} to ${userEmail}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to deliver ${setting.categoryName} to ${userEmail}: ${errorMessage}`);
      logEntry.status = 'failed';
      logEntry.errorMessage = errorMessage;
    }

    // Save delivery log
    await this.saveDeliveryLog(logEntry as DeliveryLog);
  }

  private async saveDeliveryLog(log: DeliveryLog): Promise<void> {
    try {
      const firestore = this.firebaseService.getFirestore();
      await firestore.collection('delivery_logs').add(log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to save delivery log: ${errorMessage}`);
    }
  }

  async getDeliveryLogs(userId: string, limit: number = 50): Promise<DeliveryLog[]> {
    const firestore = this.firebaseService.getFirestore();
    const logsSnapshot = await firestore
      .collection('delivery_logs')
      .where('userId', '==', userId)
      .orderBy('deliveredAt', 'desc')
      .limit(limit)
      .get();

    return logsSnapshot.docs.map(doc => doc.data() as DeliveryLog);
  }

  // New method for in-app content delivery
  async instantContentDelivery(userId: string, settingId?: string): Promise<DeliveryContentResponse | BatchDeliveryResponse> {
    this.logger.log(`Starting instant content delivery for user ${userId}${settingId ? ` (setting: ${settingId})` : ' (all settings)'}`);
    
    const userSettings = await this.settingsService.getUserSettings(userId);
    if (!userSettings || userSettings.settings.length === 0) {
      throw new Error('No settings found for user');
    }

    if (settingId) {
      // Single setting content delivery
      const setting = userSettings.settings.find(s => s.id === settingId);
      if (!setting) {
        throw new Error('Setting not found');
      }
      return await this.generateContentResponse(userId, setting);
    } else {
      // Batch content delivery for all settings
      return await this.generateBatchContentResponse(userId, userSettings.settings);
    }
  }

  private async generateContentResponse(userId: string, setting: UserSetting): Promise<DeliveryContentResponse> {
    const response: DeliveryContentResponse = {
      settingId: setting.id,
      categoryName: setting.categoryName,
      content: '',
      query: setting.geminiQuery,
      generatedAt: new Date(),
      success: false,
    };

    try {
      this.logger.log(`Generating content for ${setting.categoryName} (user: ${userId})`);
      
      // Generate content using Gemini
      const content = await this.geminiService.generateContent(setting.geminiQuery);
      
      response.content = content;
      response.success = true;
      
      // Log the delivery
      await this.saveDeliveryLog({
        userId,
        settingId: setting.id,
        deliveryType: 'instant',
        status: 'success',
        contentSummary: content.substring(0, 100) + '...',
        deliveredAt: new Date(),
      });
      
      this.logger.log(`Successfully generated content for ${setting.categoryName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      response.error = errorMessage;
      this.logger.error(`Failed to generate content for ${setting.categoryName}: ${errorMessage}`);
      
      // Log the error
      await this.saveDeliveryLog({
        userId,
        settingId: setting.id,
        deliveryType: 'instant',
        status: 'failed',
        errorMessage,
        deliveredAt: new Date(),
      });
    }

    return response;
  }

  private async generateBatchContentResponse(userId: string, settings: UserSetting[]): Promise<BatchDeliveryResponse> {
    const contents: DeliveryContentResponse[] = [];
    const errors: Array<{ settingId: string; categoryName: string; error: string }> = [];
    let successful = 0;
    let failed = 0;

    // Process all settings concurrently for better performance
    const promises = settings.map(setting => this.generateContentResponse(userId, setting));
    const results = await Promise.all(promises);

    for (const result of results) {
      contents.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
        if (result.error) {
          errors.push({
            settingId: result.settingId,
            categoryName: result.categoryName,
            error: result.error,
          });
        }
      }
    }

    return {
      contents,
      totalProcessed: settings.length,
      successful,
      failed,
      errors,
      generatedAt: new Date(),
    };
  }
}