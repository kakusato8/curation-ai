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
      categoryName: setting.categoryName,
      geminiQuery: setting.geminiQuery,
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
      logEntry.fullContent = content;
      logEntry.generatedAt = new Date();
      
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
        categoryName: setting.categoryName,
        geminiQuery: setting.geminiQuery,
        deliveryType: 'instant',
        status: 'success',
        contentSummary: content.substring(0, 100) + '...',
        fullContent: content,
        deliveredAt: new Date(),
        generatedAt: new Date(),
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
        categoryName: setting.categoryName,
        geminiQuery: setting.geminiQuery,
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

  // Enhanced delivery history methods
  async getDeliveryLogs(
    userId: string, 
    options: {
      limit?: number;
      status?: 'success' | 'failed';
      deliveryType?: 'scheduled' | 'instant';
      startDate?: Date;
      endDate?: Date;
      searchText?: string;
      categoryName?: string;
      sortBy?: 'deliveredAt' | 'generatedAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<DeliveryLog[]> {
    try {
      const {
        limit = 50,
        status,
        deliveryType,
        startDate,
        endDate,
        searchText,
        categoryName,
        sortBy = 'deliveredAt',
        sortOrder = 'desc'
      } = options;
      
      this.logger.log(`Getting delivery logs for user ${userId} with filters:`, { 
        limit, status, deliveryType, startDate, endDate, searchText, categoryName 
      });
      
      const firestore = this.firebaseService.getFirestore();
      let query = firestore
        .collection('delivery_logs')
        .where('userId', '==', userId);

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (deliveryType) {
        query = query.where('deliveryType', '==', deliveryType);
      }
      
      if (categoryName) {
        query = query.where('categoryName', '==', categoryName);
      }

      // Date range filtering
      if (startDate) {
        query = query.where(sortBy, '>=', startDate);
      }
      
      if (endDate) {
        query = query.where(sortBy, '<=', endDate);
      }

      // Apply sorting and limit
      query = query.orderBy(sortBy, sortOrder).limit(limit);

      const logsSnapshot = await query.get();
      
      let results = logsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DeliveryLog));

      // Apply text search filtering (done in-memory since Firestore doesn't support full-text search)
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        results = results.filter(log => 
          (log.categoryName?.toLowerCase().includes(searchLower)) ||
          (log.contentSummary?.toLowerCase().includes(searchLower)) ||
          (log.fullContent?.toLowerCase().includes(searchLower)) ||
          (log.geminiQuery?.toLowerCase().includes(searchLower))
        );
      }

      this.logger.log(`Found ${results.length} delivery logs for user ${userId}`);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get delivery logs for user ${userId}: ${errorMessage}`);
      
      // Fallback to simpler query if complex query fails
      if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
        this.logger.warn('Composite index may be missing, trying simpler query');
        return this.getDeliveryLogsSimple(userId, options.limit || 50);
      }
      
      throw new Error(`Failed to get delivery logs: ${errorMessage}`);
    }
  }
  
  private async getDeliveryLogsSimple(userId: string, limit: number): Promise<DeliveryLog[]> {
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
    try {
      this.logger.log(`Getting delivery log ${logId} for user ${userId}`);
      
      const firestore = this.firebaseService.getFirestore();
      const docSnapshot = await firestore
        .collection('delivery_logs')
        .doc(logId)
        .get();

      if (!docSnapshot.exists) {
        this.logger.warn(`Delivery log ${logId} not found`);
        return null;
      }

      const data = docSnapshot.data() as DeliveryLog;
      
      // Security check: ensure user ID matches
      if (data.userId !== userId) {
        this.logger.error(`Unauthorized access to delivery log ${logId} by user ${userId}`);
        throw new Error('Unauthorized access to delivery log');
      }

      return { id: docSnapshot.id, ...data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get delivery log ${logId} for user ${userId}: ${errorMessage}`);
      throw error; // Re-throw the original error
    }
  }

  async getContentArchive(
    userId: string,
    options: {
      limit?: number;
      categoryName?: string;
      startDate?: Date;
      endDate?: Date;
      searchText?: string;
      sortBy?: 'deliveredAt' | 'generatedAt' | 'categoryName';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    logs: DeliveryLog[];
    totalCount: number;
    categories: string[];
  }> {
    const {
      limit = 50,
      categoryName,
      startDate,
      endDate,
      searchText,
      sortBy = 'deliveredAt',
      sortOrder = 'desc'
    } = options;
    
    try {
      this.logger.log(`Getting content archive for user ${userId}`, { 
        limit, categoryName, startDate, endDate, searchText 
      });
      
      // Get successful delivery logs with content
      // Filter out categoryName from sortBy since getDeliveryLogs doesn't support it
      const deliveryLogsOptions = {
        limit,
        categoryName,
        startDate,
        endDate,
        searchText,
        status: 'success' as const,
        sortBy: sortBy === 'categoryName' ? 'deliveredAt' as const : sortBy,
        sortOrder
      };
      
      const logs = await this.getDeliveryLogs(userId, deliveryLogsOptions);
      
      // Filter logs that have full content
      const contentLogs = logs.filter(log => log.fullContent && log.fullContent.trim().length > 0);
      
      // Apply client-side sorting for categoryName if needed
      if (sortBy === 'categoryName') {
        contentLogs.sort((a, b) => {
          const aVal = a.categoryName || '';
          const bVal = b.categoryName || '';
          const result = aVal.localeCompare(bVal);
          return sortOrder === 'desc' ? -result : result;
        });
      }
      
      // Get unique categories
      const categoriesSet = new Set<string>();
      contentLogs.forEach(log => {
        if (log.categoryName) {
          categoriesSet.add(log.categoryName);
        }
      });
      
      const categories = Array.from(categoriesSet).sort();
      
      return {
        logs: contentLogs,
        totalCount: contentLogs.length,
        categories
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get content archive for user ${userId}: ${errorMessage}`);
      throw new Error(`Failed to get content archive: ${errorMessage}`);
    }
  }

  async getDeliveryHistoryByCategoryName(
    userId: string, 
    categoryName: string, 
    limit: number = 20
  ): Promise<DeliveryLog[]> {
    try {
      this.logger.log(`Getting delivery history for user ${userId}, category: ${categoryName}, limit: ${limit}`);
      
      const firestore = this.firebaseService.getFirestore();
      
      // First try without status filter to see if we have any data
      const testSnapshot = await firestore
        .collection('delivery_logs')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      this.logger.log(`Test query found ${testSnapshot.docs.length} documents for user ${userId}`);
      
      if (testSnapshot.docs.length === 0) {
        this.logger.warn(`No delivery logs found for user ${userId}`);
        return [];
      }
      
      // Now try the full query
      const logsSnapshot = await firestore
        .collection('delivery_logs')
        .where('userId', '==', userId)
        .where('categoryName', '==', categoryName)
        .where('status', '==', 'success')
        .orderBy('deliveredAt', 'desc')
        .limit(limit)
        .get();

      this.logger.log(`Found ${logsSnapshot.docs.length} delivery logs for user ${userId}, category: ${categoryName}`);

      return logsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DeliveryLog));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get delivery history for user ${userId}, category ${categoryName}: ${errorMessage}`);
      
      // If it's an index error, try a simpler query
      if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
        this.logger.warn('Composite index may be missing, trying simpler query');
        try {
          const firestore = this.firebaseService.getFirestore();
          const simpleSnapshot = await firestore
            .collection('delivery_logs')
            .where('userId', '==', userId)
            .orderBy('deliveredAt', 'desc')
            .limit(limit)
            .get();
          
          // Filter in memory for category and status
          const filteredDocs = simpleSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.categoryName === categoryName && data.status === 'success';
          });
          
          this.logger.log(`Fallback query returned ${filteredDocs.length} filtered results`);
          
          return filteredDocs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          } as DeliveryLog));
        } catch (fallbackError) {
          this.logger.error(`Fallback query also failed: ${fallbackError}`);
          throw new Error(`Failed to get delivery history: ${errorMessage}`);
        }
      }
      
      throw new Error(`Failed to get delivery history: ${errorMessage}`);
    }
  }
}