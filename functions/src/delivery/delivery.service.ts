import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SettingsService } from '../settings/settings.service';
import { GeminiService } from '../gemini/gemini.service';
import { UserSettings, UserSetting, DeliveryLog, BatchDeleteResponse } from '../common/interfaces/user-setting.interface';
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

    let processedUsers = 0;
    let skippedUsers = 0;
    let totalDeliveries = 0;

    try {
      // Get all user settings
      const settingsSnapshot = await firestore.collection('user_settings').get();
      this.logger.log(`Found ${settingsSnapshot.docs.length} user settings documents`);
      
      for (const doc of settingsSnapshot.docs) {
        const userSettings = doc.data() as UserSettings;
        const userId = userSettings.userId;

        // Get user email
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          this.logger.warn(`User ${userId} not found in users collection, skipping delivery`);
          skippedUsers++;
          continue;
        }
        
        const userData = userDoc.data();
        const userEmail = userData?.email;
        
        if (!userEmail) {
          this.logger.warn(`User ${userId} has no email address, skipping delivery`);
          skippedUsers++;
          continue;
        }

        processedUsers++;
        this.logger.log(`Processing deliveries for user ${userId} (${userEmail})`);

        // Check each setting for delivery (sequential execution with interval for scheduled delivery)
        let userDeliveryCount = 0;
        for (const setting of userSettings.settings) {
          if (this.shouldDeliver(setting, dayOfWeek, dayOfMonth)) {
            this.logger.log(`Delivering content for setting: ${setting.categoryName} (frequency: ${setting.frequency})`);
            await this.deliverContent(userId, userEmail, setting, 'scheduled');
            userDeliveryCount++;
            totalDeliveries++;
          }
        }
        
        if (userDeliveryCount === 0) {
          this.logger.log(`No deliveries scheduled for user ${userId} today`);
        }
      }
      
      this.logger.log(`Scheduled delivery completed: ${processedUsers} users processed, ${skippedUsers} users skipped, ${totalDeliveries} total deliveries`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in scheduled delivery: ${errorMessage}`);
      throw error; // Re-throw to ensure Cloud Functions reports the error
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

    // Process all settings concurrently for instant delivery (no interval required)
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
    
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // Use simple query with only userId filter and orderBy to avoid composite index requirements
      // Fetch more records to allow for client-side filtering
      const fetchLimit = Math.max(limit * 2, 100); // Fetch extra to account for filtering
      
      const logsSnapshot = await firestore
        .collection('delivery_logs')
        .where('userId', '==', userId)
        .orderBy(sortBy, sortOrder)
        .limit(fetchLimit)
        .get();
      
      let results = logsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DeliveryLog));

      // Apply all filters client-side
      results = this.applyClientSideFilters(results, {
        status,
        deliveryType,
        startDate,
        endDate,
        searchText,
        categoryName,
        sortBy,
        sortOrder
      });

      // Apply limit after filtering
      results = results.slice(0, limit);

      this.logger.log(`Found ${results.length} delivery logs for user ${userId} after filtering`);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get delivery logs for user ${userId}: ${errorMessage}`);
      
      // Fallback to even simpler query if needed
      if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
        this.logger.warn('Trying fallback query without orderBy');
        return this.getDeliveryLogsFallback(userId, options);
      }
      
      throw new Error(`Failed to get delivery logs: ${errorMessage}`);
    }
  }

  /**
   * Parse various Firestore date formats including timestamps and regular dates
   * Enhanced with better validation and error handling
   */
  private parseFirestoreDate(dateValue: any): Date | null {
    // Handle null, undefined, or empty values
    if (!dateValue && dateValue !== 0) {
      return null;
    }
    
    try {
      // Handle Firestore Timestamp objects with underscore format: {_seconds: 123, _nanoseconds: 456}
      if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue._seconds === 'number') {
        const seconds = dateValue._seconds;
        const nanoseconds = dateValue._nanoseconds || 0;
        // Validate seconds are within reasonable range
        if (seconds < 0 || seconds > 4102444800) { // year 2100
          this.logger.warn(`Invalid timestamp seconds: ${seconds}`);
          return null;
        }
        const date = new Date(seconds * 1000 + nanoseconds / 1000000);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Handle Firestore Timestamp objects with standard format: {seconds: 123, nanoseconds: 456}
      if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue.seconds === 'number') {
        const seconds = dateValue.seconds;
        const nanoseconds = dateValue.nanoseconds || 0;
        // Validate seconds are within reasonable range
        if (seconds < 0 || seconds > 4102444800) { // year 2100
          this.logger.warn(`Invalid timestamp seconds: ${seconds}`);
          return null;
        }
        const date = new Date(seconds * 1000 + nanoseconds / 1000000);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Handle Firebase Timestamp objects with toDate method
      if (typeof dateValue === 'object' && dateValue !== null && typeof dateValue.toDate === 'function') {
        try {
          const date = dateValue.toDate();
          return isNaN(date.getTime()) ? null : date;
        } catch (error) {
          this.logger.warn('Error calling toDate():', error);
          return null;
        }
      }
      
      // Handle regular Date objects
      if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? null : dateValue;
      }
      
      // Handle string/number formats
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
      
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${dateValue}`, error);
      return null;
    }
  }

  private applyClientSideFilters(
    logs: DeliveryLog[], 
    filters: {
      status?: 'success' | 'failed';
      deliveryType?: 'scheduled' | 'instant';
      startDate?: Date;
      endDate?: Date;
      searchText?: string;
      categoryName?: string;
      sortBy?: 'deliveredAt' | 'generatedAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): DeliveryLog[] {
    let results = logs;

    // Apply status filter
    if (filters.status) {
      results = results.filter(log => log.status === filters.status);
    }

    // Apply delivery type filter
    if (filters.deliveryType) {
      results = results.filter(log => log.deliveryType === filters.deliveryType);
    }

    // Apply category filter
    if (filters.categoryName) {
      results = results.filter(log => log.categoryName === filters.categoryName);
    }

    // Apply date range filters
    if (filters.startDate || filters.endDate) {
      this.logger.log(`Applying date filters: startDate=${filters.startDate?.toISOString()}, endDate=${filters.endDate?.toISOString()}`);
      
      results = results.filter(log => {
        // Safely handle date parsing
        const rawDate = filters.sortBy === 'generatedAt' && log.generatedAt 
          ? log.generatedAt
          : log.deliveredAt;
          
        // Skip logs with invalid or missing dates
        if (!rawDate) {
          this.logger.warn(`Log ${log.id}: missing date field`);
          return false;
        }
        
        // Enhanced date parsing for various formats including Firestore timestamps  
        const logDate = this.parseFirestoreDate(rawDate);
        
        // Skip logs with invalid dates
        if (!logDate || isNaN(logDate.getTime())) {
          this.logger.warn(`Log ${log.id}: invalid date value: ${rawDate}`);
          return false;
        }
        
        const isInRange = !(
          (filters.startDate && logDate < filters.startDate) ||
          (filters.endDate && logDate > filters.endDate)
        );
        
        this.logger.log(`Log ${log.id}: deliveredAt=${rawDate}, logDate=${logDate.toISOString()}, inRange=${isInRange}`);
        
        return isInRange;
      });
      
      this.logger.log(`After date filtering: ${results.length} results`);
    }

    // Apply text search filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      results = results.filter(log => 
        (log.categoryName?.toLowerCase().includes(searchLower)) ||
        (log.contentSummary?.toLowerCase().includes(searchLower)) ||
        (log.fullContent?.toLowerCase().includes(searchLower)) ||
        (log.geminiQuery?.toLowerCase().includes(searchLower))
      );
    }

    return results;
  }

  private async getDeliveryLogsFallback(
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
    }
  ): Promise<DeliveryLog[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const fetchLimit = Math.max((options.limit || 50) * 2, 100);
      
      // Simplest possible query - just userId filter
      const logsSnapshot = await firestore
        .collection('delivery_logs')
        .where('userId', '==', userId)
        .limit(fetchLimit)
        .get();
      
      let results = logsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DeliveryLog));

      // Apply all filtering and sorting client-side
      results = this.applyClientSideFilters(results, options);

      // Sort client-side
      const sortBy = options.sortBy || 'deliveredAt';
      const sortOrder = options.sortOrder || 'desc';
      results.sort((a, b) => {
        // Safely parse dates for sorting using enhanced date parser
        const aRawDate = sortBy === 'generatedAt' && a.generatedAt ? a.generatedAt : a.deliveredAt;
        const bRawDate = sortBy === 'generatedAt' && b.generatedAt ? b.generatedAt : b.deliveredAt;
        
        const aDate = this.parseFirestoreDate(aRawDate);
        const bDate = this.parseFirestoreDate(bRawDate);
        
        // Handle invalid dates by treating them as epoch (0)
        const aVal = aDate ? aDate.getTime() : 0;
        const bVal = bDate ? bDate.getTime() : 0;
        
        const result = aVal - bVal;
        return sortOrder === 'desc' ? -result : result;
      });

      // Apply limit
      results = results.slice(0, options.limit || 50);

      this.logger.log(`Fallback query returned ${results.length} delivery logs for user ${userId}`);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallback query failed for user ${userId}: ${errorMessage}`);
      throw new Error(`Failed to get delivery logs: ${errorMessage}`);
    }
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
      
      // Get user settings for category order
      const userSettings = await this.settingsService.getUserSettings(userId);
      const settingsMap = new Map(userSettings.settings.map(s => [s.categoryName, s]));
      
      // Apply client-side sorting for categoryName if needed
      if (sortBy === 'categoryName') {
        contentLogs.sort((a, b) => {
          const aName = a.categoryName || '';
          const bName = b.categoryName || '';
          
          const aSetting = settingsMap.get(aName);
          const bSetting = settingsMap.get(bName);
          
          const aOrder = aSetting?.displayOrder ?? 999999;
          const bOrder = bSetting?.displayOrder ?? 999999;
          
          // Primary sort by display order
          if (aOrder !== bOrder) {
            return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
          }
          
          // Secondary sort by category name
          const comparison = aName.localeCompare(bName);
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      } else {
        // For other sorting, add secondary sort by category display order
        contentLogs.sort((a, b) => {
          // First apply the requested sort
          let comparison = 0;
          if (sortBy === 'deliveredAt' && a.deliveredAt && b.deliveredAt) {
            const aDate = this.parseFirestoreDate(a.deliveredAt);
            const bDate = this.parseFirestoreDate(b.deliveredAt);
            if (aDate && bDate && !isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
              comparison = aDate.getTime() - bDate.getTime();
            }
          } else if (sortBy === 'generatedAt' && a.generatedAt && b.generatedAt) {
            const aDate = this.parseFirestoreDate(a.generatedAt);
            const bDate = this.parseFirestoreDate(b.generatedAt);
            if (aDate && bDate && !isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
              comparison = aDate.getTime() - bDate.getTime();
            }
          }
          
          if (comparison !== 0) {
            return sortOrder === 'asc' ? comparison : -comparison;
          }
          
          // Secondary sort by category display order
          const aName = a.categoryName || '';
          const bName = b.categoryName || '';
          const aSetting = settingsMap.get(aName);
          const bSetting = settingsMap.get(bName);
          const aOrder = aSetting?.displayOrder ?? 999999;
          const bOrder = bSetting?.displayOrder ?? 999999;
          
          return aOrder - bOrder;
        });
      }
      
      // Get unique categories sorted by display order
      const categoriesSet = new Set<string>();
      contentLogs.forEach(log => {
        if (log.categoryName) {
          categoriesSet.add(log.categoryName);
        }
      });
      
      const categories = Array.from(categoriesSet).sort((a, b) => {
        const aSetting = settingsMap.get(a);
        const bSetting = settingsMap.get(b);
        const aOrder = aSetting?.displayOrder ?? 999999;
        const bOrder = bSetting?.displayOrder ?? 999999;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return a.localeCompare(b);
      });
      
      return {
        logs: contentLogs,
        totalCount: contentLogs.length,
        categories
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get content archive for user ${userId}: ${errorMessage}`);
      
      // If the error is related to index issues, provide a more helpful error message
      if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
        this.logger.warn('Content archive failed due to index requirements, but this should be handled by fallback queries');
      }
      
      throw new Error(`Failed to get content archive: ${errorMessage}`);
    }
  }

  async getDeliveryHistoryByCategoryName(
    userId: string, 
    categoryName: string, 
    limit: number = 20
  ): Promise<DeliveryLog[]> {
    this.logger.log(`Getting delivery history for user ${userId}, category: ${categoryName}, limit: ${limit}`);
    
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // Use simple query to avoid composite index requirements
      // Fetch extra records to account for filtering
      const fetchLimit = Math.max(limit * 3, 50);
      
      const logsSnapshot = await firestore
        .collection('delivery_logs')
        .where('userId', '==', userId)
        .orderBy('deliveredAt', 'desc')
        .limit(fetchLimit)
        .get();
      
      // Apply client-side filtering for category and status
      const filteredResults = logsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as DeliveryLog))
        .filter(log => log.categoryName === categoryName && log.status === 'success')
        .slice(0, limit);

      this.logger.log(`Found ${filteredResults.length} delivery logs for user ${userId}, category: ${categoryName}`);
      return filteredResults;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get delivery history for user ${userId}, category ${categoryName}: ${errorMessage}`);
      
      // If orderBy also fails due to index issues, try the simplest query
      if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
        this.logger.warn('OrderBy may require index, trying simplest query');
        return this.getDeliveryHistorySimple(userId, categoryName, limit);
      }
      
      throw new Error(`Failed to get delivery history: ${errorMessage}`);
    }
  }

  private async getDeliveryHistorySimple(
    userId: string, 
    categoryName: string, 
    limit: number
  ): Promise<DeliveryLog[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // Simplest possible query - just userId filter
      const fetchLimit = Math.max(limit * 5, 100); // Fetch even more for filtering
      const logsSnapshot = await firestore
        .collection('delivery_logs')
        .where('userId', '==', userId)
        .limit(fetchLimit)
        .get();
      
      // Apply all filtering and sorting client-side
      const results = logsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as DeliveryLog))
        .filter(log => log.categoryName === categoryName && log.status === 'success')
        .sort((a, b) => {
          const aDate = this.parseFirestoreDate(a.deliveredAt);
          const bDate = this.parseFirestoreDate(b.deliveredAt);
          const aTime = aDate ? aDate.getTime() : 0;
          const bTime = bDate ? bDate.getTime() : 0;
          return bTime - aTime; // desc order
        })
        .slice(0, limit);
      
      this.logger.log(`Simple query returned ${results.length} filtered results for user ${userId}, category: ${categoryName}`);
      return results;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Simple query failed for user ${userId}, category ${categoryName}: ${errorMessage}`);
      throw new Error(`Failed to get delivery history: ${errorMessage}`);
    }
  }

  // Delete methods for content management
  async deleteDeliveryLog(
    userId: string, 
    logId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`=== SINGLE DELETE START === User: ${userId}, LogId: ${logId}`);
    
    try {
      const firestore = this.firebaseService.getFirestore();
      
      // First, verify the log exists and belongs to the user
      const docRef = firestore.collection('delivery_logs').doc(logId);
      const docSnapshot = await docRef.get();
      
      this.logger.log(`Document exists: ${docSnapshot.exists}`);
      
      if (!docSnapshot.exists) {
        this.logger.warn(`Delivery log ${logId} not found`);
        return { success: false, error: 'Content not found' };
      }

      const logData = docSnapshot.data() as DeliveryLog;
      this.logger.log(`Document data userId: ${logData.userId}, requesting userId: ${userId}`);
      
      // Security check: ensure user ID matches
      if (logData.userId !== userId) {
        this.logger.error(`Unauthorized deletion attempt: User ${userId} tried to delete log ${logId} owned by ${logData.userId}`);
        return { success: false, error: 'Unauthorized: You can only delete your own content' };
      }

      // Delete the document
      this.logger.log(`Deleting document ${logId}...`);
      await docRef.delete();
      
      this.logger.log(`=== SINGLE DELETE SUCCESS === LogId: ${logId} deleted successfully`);
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`=== SINGLE DELETE FAILED === LogId: ${logId}, Error: ${errorMessage}`);
      return { success: false, error: `Failed to delete content: ${errorMessage}` };
    }
  }

  async batchDeleteDeliveryLogs(
    userId: string, 
    logIds: string[]
  ): Promise<BatchDeleteResponse> {
    this.logger.log(`=== BATCH DELETE START === User: ${userId}, LogIds: ${logIds.join(', ')}`);
    
    const results = {
      successful: 0,
      failed: 0,
      deletedIds: [] as string[],
      errors: [] as Array<{ logId: string; error: string }>
    };
    
    this.logger.log('Initial results object:', results);
    
    // Process deletions sequentially to avoid overwhelming Firestore
    for (const logId of logIds) {
      this.logger.log(`Processing deletion for logId: ${logId}`);
      try {
        const result = await this.deleteDeliveryLog(userId, logId);
        this.logger.log(`Single delete result for ${logId}:`, result);
        
        if (result.success) {
          results.successful++;
          results.deletedIds.push(logId);
          this.logger.log(`Successfully deleted ${logId}, adding to deletedIds. Current deletedIds:`, results.deletedIds);
        } else {
          results.failed++;
          results.errors.push({
            logId,
            error: result.error || 'Unknown error'
          });
          this.logger.log(`Failed to delete ${logId}, error: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.failed++;
        results.errors.push({
          logId,
          error: errorMessage
        });
        this.logger.error(`Exception during deletion of log ${logId}: ${errorMessage}`);
      }
    }

    this.logger.log('Final batch delete results:', results);
    this.logger.log(
      `=== BATCH DELETE COMPLETE === User: ${userId}, Successful: ${results.successful}, Failed: ${results.failed}, DeletedIds: [${results.deletedIds.join(', ')}]`
    );
    
    return results;
  }

  // Data integrity utility methods
  async checkDataIntegrity(): Promise<{
    totalUserSettings: number;
    usersWithoutProfiles: string[];
    settingsWithoutUsers: string[];
    summary: string;
  }> {
    this.logger.log('Starting data integrity check...');
    
    const firestore = this.firebaseService.getFirestore();
    const usersWithoutProfiles: string[] = [];
    const settingsWithoutUsers: string[] = [];
    
    try {
      // Get all user settings
      const settingsSnapshot = await firestore.collection('user_settings').get();
      const totalUserSettings = settingsSnapshot.docs.length;
      
      this.logger.log(`Found ${totalUserSettings} user settings documents`);
      
      for (const doc of settingsSnapshot.docs) {
        const userSettings = doc.data() as UserSettings;
        const userId = userSettings.userId;
        
        // Check if user exists
        const userDoc = await firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          settingsWithoutUsers.push(userId);
        } else {
          const userData = userDoc.data();
          if (!userData?.email) {
            usersWithoutProfiles.push(userId);
          }
        }
      }
      
      const summary = `Data integrity check completed:
- Total user settings: ${totalUserSettings}
- Settings without corresponding users: ${settingsWithoutUsers.length}
- Users without email addresses: ${usersWithoutProfiles.length}`;
      
      this.logger.log(summary);
      
      return {
        totalUserSettings,
        usersWithoutProfiles,
        settingsWithoutUsers,
        summary
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Data integrity check failed: ${errorMessage}`);
      throw new Error(`Data integrity check failed: ${errorMessage}`);
    }
  }

  async cleanupOrphanedSettings(): Promise<{
    removedSettings: string[];
    errors: Array<{ userId: string; error: string }>;
  }> {
    this.logger.log('Starting cleanup of orphaned settings...');
    
    const firestore = this.firebaseService.getFirestore();
    const removedSettings: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];
    
    try {
      const integrityCheck = await this.checkDataIntegrity();
      
      for (const userId of integrityCheck.settingsWithoutUsers) {
        try {
          this.logger.log(`Removing orphaned settings for user: ${userId}`);
          
          // Find and delete the user_settings document
          const settingsQuery = await firestore
            .collection('user_settings')
            .where('userId', '==', userId)
            .get();
          
          for (const doc of settingsQuery.docs) {
            await doc.ref.delete();
            removedSettings.push(userId);
            this.logger.log(`Removed settings document for user: ${userId}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ userId, error: errorMessage });
          this.logger.error(`Failed to remove settings for user ${userId}: ${errorMessage}`);
        }
      }
      
      this.logger.log(`Cleanup completed: ${removedSettings.length} orphaned settings removed, ${errors.length} errors`);
      
      return { removedSettings, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cleanup failed: ${errorMessage}`);
      throw new Error(`Cleanup failed: ${errorMessage}`);
    }
  }

  // Enhanced diagnostic methods
  async getDetailedDatabaseStatus(): Promise<{
    users: any[];
    userSettings: any[];
    deliveryLogs: any[];
    timestamp: string;
  }> {
    this.logger.log('Getting detailed database status...');
    
    const firestore = this.firebaseService.getFirestore();
    
    try {
      // Get all users
      const usersSnapshot = await firestore.collection('users').get();
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all user_settings
      const settingsSnapshot = await firestore.collection('user_settings').get();
      const userSettings = settingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get recent delivery_logs (last 20)
      const logsSnapshot = await firestore
        .collection('delivery_logs')
        .orderBy('deliveredAt', 'desc')
        .limit(20)
        .get();
      const deliveryLogs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        users,
        userSettings,
        deliveryLogs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get detailed database status: ${errorMessage}`);
      throw new Error(`Failed to get detailed database status: ${errorMessage}`);
    }
  }

  // Recovery method to restore users collection from existing data
  async recoverUsersFromSettings(): Promise<{
    recoveredUsers: string[];
    errors: Array<{ userId: string; error: string }>;
  }> {
    this.logger.log('Starting user recovery from settings...');
    
    const firestore = this.firebaseService.getFirestore();
    const recoveredUsers: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];
    
    try {
      // Get all user_settings
      const settingsSnapshot = await firestore.collection('user_settings').get();
      
      for (const doc of settingsSnapshot.docs) {
        const userSettings = doc.data();
        const userId = userSettings.userId;
        
        try {
          // Check if user already exists
          const userDoc = await firestore.collection('users').doc(userId).get();
          
          if (!userDoc.exists) {
            // Create user document with minimal required data
            const userData = {
              uid: userId,
              email: `user-${userId}@example.com`, // Placeholder email
              displayName: `User ${userId.substring(0, 8)}`, // Shortened display name
              createdAt: new Date(),
              updatedAt: new Date(),
              emailVerified: true,
              // Add any other required fields
            };
            
            await firestore.collection('users').doc(userId).set(userData);
            recoveredUsers.push(userId);
            this.logger.log(`Recovered user: ${userId}`);
          } else {
            this.logger.log(`User ${userId} already exists, skipping`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ userId, error: errorMessage });
          this.logger.error(`Failed to recover user ${userId}: ${errorMessage}`);
        }
      }
      
      this.logger.log(`User recovery completed: ${recoveredUsers.length} users recovered, ${errors.length} errors`);
      
      return { recoveredUsers, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`User recovery failed: ${errorMessage}`);
      throw new Error(`User recovery failed: ${errorMessage}`);
    }
  }

  // Check specific user data by email
  async checkUserByEmail(email: string): Promise<{
    firebaseAuth: any | null;
    firestoreUser: any | null;
    userSettings: any | null;
    deliveryLogs: any[];
    authUid: string | null;
    firestoreUserId: string | null;
    settingsUserId: string | null;
    isDataConsistent: boolean;
    issues: string[];
  }> {
    this.logger.log(`Checking user data for email: ${email}`);
    
    const firestore = this.firebaseService.getFirestore();
    const auth = this.firebaseService.getAuth();
    const issues: string[] = [];
    
    try {
      // 1. Check Firebase Auth
      let firebaseAuthUser = null;
      let authUid = null;
      try {
        firebaseAuthUser = await auth.getUserByEmail(email);
        authUid = firebaseAuthUser.uid;
      } catch (error) {
        issues.push(`Firebase Auth user not found for email: ${email}`);
      }

      // 2. Check Firestore users collection
      let firestoreUser = null;
      let firestoreUserId = null;
      if (authUid) {
        const userDoc = await firestore.collection('users').doc(authUid).get();
        if (userDoc.exists) {
          firestoreUser = { id: userDoc.id, ...userDoc.data() };
          firestoreUserId = userDoc.id;
        } else {
          issues.push(`Firestore user document not found for UID: ${authUid}`);
        }
      }

      // 3. Check user_settings collection
      let userSettings = null;
      let settingsUserId = null;
      
      // Try to find settings by authUid first
      if (authUid) {
        const settingsQuery = await firestore
          .collection('user_settings')
          .where('userId', '==', authUid)
          .get();
        
        if (!settingsQuery.empty) {
          const settingsData = settingsQuery.docs[0].data();
          userSettings = { id: settingsQuery.docs[0].id, ...settingsData };
          settingsUserId = settingsData.userId;
        }
      }

      // If not found by authUid, mark as issue
      if (!userSettings) {
        issues.push(`user_settings not found for user`);
      }

      // 4. Check delivery logs (using simple query to avoid index issues)
      let deliveryLogs: any[] = [];
      if (authUid) {
        try {
          const logsQuery = await firestore
            .collection('delivery_logs')
            .where('userId', '==', authUid)
            .limit(10)
            .get();
          
          deliveryLogs = logsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
          // If query fails due to index issues, skip delivery logs check
          issues.push(`Could not retrieve delivery logs: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 5. Check consistency
      const isDataConsistent = authUid === firestoreUserId && authUid === settingsUserId;
      
      if (!isDataConsistent) {
        issues.push(`Data inconsistency: authUid(${authUid}) != firestoreUserId(${firestoreUserId}) != settingsUserId(${settingsUserId})`);
      }

      return {
        firebaseAuth: firebaseAuthUser,
        firestoreUser,
        userSettings,
        deliveryLogs,
        authUid,
        firestoreUserId,
        settingsUserId,
        isDataConsistent,
        issues
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check user data for ${email}: ${errorMessage}`);
      throw new Error(`Failed to check user data: ${errorMessage}`);
    }
  }

  // Fix user email in Firestore to match Firebase Auth
  async fixUserEmail(authUid: string, correctEmail: string): Promise<{
    success: boolean;
    message: string;
    updatedUser: any | null;
  }> {
    this.logger.log(`Fixing email for user ${authUid} to ${correctEmail}`);
    
    const firestore = this.firebaseService.getFirestore();
    
    try {
      const userDoc = await firestore.collection('users').doc(authUid).get();
      
      if (!userDoc.exists) {
        return {
          success: false,
          message: 'User document not found',
          updatedUser: null
        };
      }
      
      const userData = userDoc.data();
      const updatedUserData = {
        ...userData,
        email: correctEmail,
        updatedAt: new Date()
      };
      
      await firestore.collection('users').doc(authUid).set(updatedUserData);
      
      this.logger.log(`Updated email for user ${authUid} from ${userData?.email} to ${correctEmail}`);
      
      return {
        success: true,
        message: `Email updated successfully from ${userData?.email} to ${correctEmail}`,
        updatedUser: updatedUserData
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fix user email: ${errorMessage}`);
      return {
        success: false,
        message: `Failed to fix user email: ${errorMessage}`,
        updatedUser: null
      };
    }
  }

}