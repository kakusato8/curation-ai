import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FirebaseService } from '../firebase/firebase.service';
import { SettingsService } from '../settings/settings.service';
import { GeminiService } from '../gemini/gemini.service';
import { EmailService } from '../email/email.service';
import { UserSettings, UserSetting, DeliveryLog } from '../common/interfaces/user-setting.interface';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private firebaseService: FirebaseService,
    private settingsService: SettingsService,
    private geminiService: GeminiService,
    private emailService: EmailService,
  ) {}

  @Cron('0 5 * * *')
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
      this.logger.error(`Error in scheduled delivery: ${error.message}`);
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
    const generatedAt = new Date();
    const logEntry: Partial<DeliveryLog> = {
      userId,
      settingId: setting.id,
      categoryName: setting.categoryName,
      geminiQuery: setting.geminiQuery,
      deliveryType,
      deliveredAt: new Date(),
      recipientEmail: userEmail,
      generatedAt,
    };

    try {
      this.logger.log(`Generating content for ${setting.categoryName} (user: ${userId})`);
      
      // Generate content using Gemini
      const content = await this.geminiService.generateContent(setting.geminiQuery);
      
      // Send email
      await this.emailService.sendPersonalizedContent(
        userEmail,
        setting.categoryName,
        content,
      );

      logEntry.status = 'success';
      logEntry.contentSummary = content.substring(0, 200) + (content.length > 200 ? '...' : '');
      logEntry.fullContent = content; // 全文保存
      
      this.logger.log(`Successfully delivered ${setting.categoryName} to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to deliver ${setting.categoryName} to ${userEmail}: ${error.message}`);
      logEntry.status = 'failed';
      logEntry.errorMessage = error.message;
    }

    // Save delivery log
    await this.saveDeliveryLog(logEntry as DeliveryLog);
  }

  private async saveDeliveryLog(log: DeliveryLog): Promise<void> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = await firestore.collection('delivery_logs').add(log);
      // ドキュメントIDを後で更新
      await docRef.update({ id: docRef.id });
    } catch (error) {
      this.logger.error(`Failed to save delivery log: ${error.message}`);
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

    return logsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as DeliveryLog));
  }

  async getDeliveryLogById(userId: string, logId: string): Promise<DeliveryLog | null> {
    const firestore = this.firebaseService.getFirestore();
    const docSnapshot = await firestore
      .collection('delivery_logs')
      .doc(logId)
      .get();

    if (!docSnapshot.exists) {
      return null;
    }

    const data = docSnapshot.data() as DeliveryLog;
    
    // セキュリティチェック: ユーザーIDが一致するかの確認
    if (data.userId !== userId) {
      throw new Error('Unauthorized access to delivery log');
    }

    return { id: docSnapshot.id, ...data };
  }

  async getDeliveryHistoryByCategoryName(
    userId: string, 
    categoryName: string, 
    limit: number = 20
  ): Promise<DeliveryLog[]> {
    const firestore = this.firebaseService.getFirestore();
    const logsSnapshot = await firestore
      .collection('delivery_logs')
      .where('userId', '==', userId)
      .where('categoryName', '==', categoryName)
      .where('status', '==', 'success')
      .orderBy('deliveredAt', 'desc')
      .limit(limit)
      .get();

    return logsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as DeliveryLog));
  }
}