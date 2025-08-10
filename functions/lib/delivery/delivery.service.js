"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DeliveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
const settings_service_1 = require("../settings/settings.service");
const gemini_service_1 = require("../gemini/gemini.service");
let DeliveryService = DeliveryService_1 = class DeliveryService {
    constructor(firebaseService, settingsService, geminiService) {
        this.firebaseService = firebaseService;
        this.settingsService = settingsService;
        this.geminiService = geminiService;
        this.logger = new common_1.Logger(DeliveryService_1.name);
    }
    async handleScheduledDelivery() {
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
                const userSettings = doc.data();
                const userId = userSettings.userId;
                // Get user email
                const userDoc = await firestore.collection('users').doc(userId).get();
                if (!userDoc.exists) {
                    this.logger.warn(`User ${userId} not found in users collection, skipping delivery`);
                    skippedUsers++;
                    continue;
                }
                const userData = userDoc.data();
                const userEmail = userData === null || userData === void 0 ? void 0 : userData.email;
                if (!userEmail) {
                    this.logger.warn(`User ${userId} has no email address, skipping delivery`);
                    skippedUsers++;
                    continue;
                }
                processedUsers++;
                this.logger.log(`Processing deliveries for user ${userId} (${userEmail})`);
                // Check each setting for delivery
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in scheduled delivery: ${errorMessage}`);
            throw error; // Re-throw to ensure Cloud Functions reports the error
        }
    }
    shouldDeliver(setting, dayOfWeek, dayOfMonth) {
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
    async instantDelivery(userId, settingId) {
        var _a;
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
        const userEmail = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
        if (settingId) {
            // Deliver specific setting
            const setting = userSettings.settings.find(s => s.id === settingId);
            if (!setting) {
                throw new Error('Setting not found');
            }
            await this.deliverContent(userId, userEmail, setting, 'instant');
        }
        else {
            // Deliver all settings
            for (const setting of userSettings.settings) {
                await this.deliverContent(userId, userEmail, setting, 'instant');
            }
        }
    }
    async deliverContent(userId, userEmail, setting, deliveryType) {
        const logEntry = {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to deliver ${setting.categoryName} to ${userEmail}: ${errorMessage}`);
            logEntry.status = 'failed';
            logEntry.errorMessage = errorMessage;
        }
        // Save delivery log
        await this.saveDeliveryLog(logEntry);
    }
    async saveDeliveryLog(log) {
        try {
            const firestore = this.firebaseService.getFirestore();
            await firestore.collection('delivery_logs').add(log);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to save delivery log: ${errorMessage}`);
        }
    }
    // New method for in-app content delivery
    async instantContentDelivery(userId, settingId) {
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
        }
        else {
            // Batch content delivery for all settings
            return await this.generateBatchContentResponse(userId, userSettings.settings);
        }
    }
    async generateContentResponse(userId, setting) {
        const response = {
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
        }
        catch (error) {
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
    async generateBatchContentResponse(userId, settings) {
        const contents = [];
        const errors = [];
        let successful = 0;
        let failed = 0;
        // Process all settings concurrently for better performance
        const promises = settings.map(setting => this.generateContentResponse(userId, setting));
        const results = await Promise.all(promises);
        for (const result of results) {
            contents.push(result);
            if (result.success) {
                successful++;
            }
            else {
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
    async getDeliveryLogs(userId, options = {}) {
        const { limit = 50, status, deliveryType, startDate, endDate, searchText, categoryName, sortBy = 'deliveredAt', sortOrder = 'desc' } = options;
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
            let results = logsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        }
        catch (error) {
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
    applyClientSideFilters(logs, filters) {
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
            results = results.filter(log => {
                const logDate = filters.sortBy === 'generatedAt' && log.generatedAt
                    ? new Date(log.generatedAt)
                    : new Date(log.deliveredAt);
                if (filters.startDate && logDate < filters.startDate)
                    return false;
                if (filters.endDate && logDate > filters.endDate)
                    return false;
                return true;
            });
        }
        // Apply text search filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            results = results.filter(log => {
                var _a, _b, _c, _d;
                return ((_a = log.categoryName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                    ((_b = log.contentSummary) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)) ||
                    ((_c = log.fullContent) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchLower)) ||
                    ((_d = log.geminiQuery) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(searchLower));
            });
        }
        return results;
    }
    async getDeliveryLogsFallback(userId, options) {
        try {
            const firestore = this.firebaseService.getFirestore();
            const fetchLimit = Math.max((options.limit || 50) * 2, 100);
            // Simplest possible query - just userId filter
            const logsSnapshot = await firestore
                .collection('delivery_logs')
                .where('userId', '==', userId)
                .limit(fetchLimit)
                .get();
            let results = logsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Apply all filtering and sorting client-side
            results = this.applyClientSideFilters(results, options);
            // Sort client-side
            const sortBy = options.sortBy || 'deliveredAt';
            const sortOrder = options.sortOrder || 'desc';
            results.sort((a, b) => {
                const aVal = sortBy === 'generatedAt' && a.generatedAt
                    ? new Date(a.generatedAt).getTime()
                    : new Date(a.deliveredAt).getTime();
                const bVal = sortBy === 'generatedAt' && b.generatedAt
                    ? new Date(b.generatedAt).getTime()
                    : new Date(b.deliveredAt).getTime();
                const result = aVal - bVal;
                return sortOrder === 'desc' ? -result : result;
            });
            // Apply limit
            results = results.slice(0, options.limit || 50);
            this.logger.log(`Fallback query returned ${results.length} delivery logs for user ${userId}`);
            return results;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Fallback query failed for user ${userId}: ${errorMessage}`);
            throw new Error(`Failed to get delivery logs: ${errorMessage}`);
        }
    }
    async getDeliveryLogById(userId, logId) {
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
            const data = docSnapshot.data();
            // Security check: ensure user ID matches
            if (data.userId !== userId) {
                this.logger.error(`Unauthorized access to delivery log ${logId} by user ${userId}`);
                throw new Error('Unauthorized access to delivery log');
            }
            return Object.assign({ id: docSnapshot.id }, data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to get delivery log ${logId} for user ${userId}: ${errorMessage}`);
            throw error; // Re-throw the original error
        }
    }
    async getContentArchive(userId, options = {}) {
        const { limit = 50, categoryName, startDate, endDate, searchText, sortBy = 'deliveredAt', sortOrder = 'desc' } = options;
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
                status: 'success',
                sortBy: sortBy === 'categoryName' ? 'deliveredAt' : sortBy,
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
                    var _a, _b;
                    const aName = a.categoryName || '';
                    const bName = b.categoryName || '';
                    const aSetting = settingsMap.get(aName);
                    const bSetting = settingsMap.get(bName);
                    const aOrder = (_a = aSetting === null || aSetting === void 0 ? void 0 : aSetting.displayOrder) !== null && _a !== void 0 ? _a : 999999;
                    const bOrder = (_b = bSetting === null || bSetting === void 0 ? void 0 : bSetting.displayOrder) !== null && _b !== void 0 ? _b : 999999;
                    // Primary sort by display order
                    if (aOrder !== bOrder) {
                        return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
                    }
                    // Secondary sort by category name
                    const comparison = aName.localeCompare(bName);
                    return sortOrder === 'asc' ? comparison : -comparison;
                });
            }
            else {
                // For other sorting, add secondary sort by category display order
                contentLogs.sort((a, b) => {
                    var _a, _b;
                    // First apply the requested sort
                    let comparison = 0;
                    if (sortBy === 'deliveredAt' && a.deliveredAt && b.deliveredAt) {
                        comparison = new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime();
                    }
                    else if (sortBy === 'generatedAt' && a.generatedAt && b.generatedAt) {
                        comparison = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
                    }
                    if (comparison !== 0) {
                        return sortOrder === 'asc' ? comparison : -comparison;
                    }
                    // Secondary sort by category display order
                    const aName = a.categoryName || '';
                    const bName = b.categoryName || '';
                    const aSetting = settingsMap.get(aName);
                    const bSetting = settingsMap.get(bName);
                    const aOrder = (_a = aSetting === null || aSetting === void 0 ? void 0 : aSetting.displayOrder) !== null && _a !== void 0 ? _a : 999999;
                    const bOrder = (_b = bSetting === null || bSetting === void 0 ? void 0 : bSetting.displayOrder) !== null && _b !== void 0 ? _b : 999999;
                    return aOrder - bOrder;
                });
            }
            // Get unique categories sorted by display order
            const categoriesSet = new Set();
            contentLogs.forEach(log => {
                if (log.categoryName) {
                    categoriesSet.add(log.categoryName);
                }
            });
            const categories = Array.from(categoriesSet).sort((a, b) => {
                var _a, _b;
                const aSetting = settingsMap.get(a);
                const bSetting = settingsMap.get(b);
                const aOrder = (_a = aSetting === null || aSetting === void 0 ? void 0 : aSetting.displayOrder) !== null && _a !== void 0 ? _a : 999999;
                const bOrder = (_b = bSetting === null || bSetting === void 0 ? void 0 : bSetting.displayOrder) !== null && _b !== void 0 ? _b : 999999;
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to get content archive for user ${userId}: ${errorMessage}`);
            // If the error is related to index issues, provide a more helpful error message
            if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
                this.logger.warn('Content archive failed due to index requirements, but this should be handled by fallback queries');
            }
            throw new Error(`Failed to get content archive: ${errorMessage}`);
        }
    }
    async getDeliveryHistoryByCategoryName(userId, categoryName, limit = 20) {
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
                .map(doc => (Object.assign({ id: doc.id }, doc.data())))
                .filter(log => log.categoryName === categoryName && log.status === 'success')
                .slice(0, limit);
            this.logger.log(`Found ${filteredResults.length} delivery logs for user ${userId}, category: ${categoryName}`);
            return filteredResults;
        }
        catch (error) {
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
    async getDeliveryHistorySimple(userId, categoryName, limit) {
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
                .map(doc => (Object.assign({ id: doc.id }, doc.data())))
                .filter(log => log.categoryName === categoryName && log.status === 'success')
                .sort((a, b) => {
                const aTime = new Date(a.deliveredAt).getTime();
                const bTime = new Date(b.deliveredAt).getTime();
                return bTime - aTime; // desc order
            })
                .slice(0, limit);
            this.logger.log(`Simple query returned ${results.length} filtered results for user ${userId}, category: ${categoryName}`);
            return results;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Simple query failed for user ${userId}, category ${categoryName}: ${errorMessage}`);
            throw new Error(`Failed to get delivery history: ${errorMessage}`);
        }
    }
    // Delete methods for content management
    async deleteDeliveryLog(userId, logId) {
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
            const logData = docSnapshot.data();
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`=== SINGLE DELETE FAILED === LogId: ${logId}, Error: ${errorMessage}`);
            return { success: false, error: `Failed to delete content: ${errorMessage}` };
        }
    }
    async batchDeleteDeliveryLogs(userId, logIds) {
        this.logger.log(`=== BATCH DELETE START === User: ${userId}, LogIds: ${logIds.join(', ')}`);
        const results = {
            successful: 0,
            failed: 0,
            deletedIds: [],
            errors: []
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
                }
                else {
                    results.failed++;
                    results.errors.push({
                        logId,
                        error: result.error || 'Unknown error'
                    });
                    this.logger.log(`Failed to delete ${logId}, error: ${result.error}`);
                }
            }
            catch (error) {
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
        this.logger.log(`=== BATCH DELETE COMPLETE === User: ${userId}, Successful: ${results.successful}, Failed: ${results.failed}, DeletedIds: [${results.deletedIds.join(', ')}]`);
        return results;
    }
    // Data integrity utility methods
    async checkDataIntegrity() {
        this.logger.log('Starting data integrity check...');
        const firestore = this.firebaseService.getFirestore();
        const usersWithoutProfiles = [];
        const settingsWithoutUsers = [];
        try {
            // Get all user settings
            const settingsSnapshot = await firestore.collection('user_settings').get();
            const totalUserSettings = settingsSnapshot.docs.length;
            this.logger.log(`Found ${totalUserSettings} user settings documents`);
            for (const doc of settingsSnapshot.docs) {
                const userSettings = doc.data();
                const userId = userSettings.userId;
                // Check if user exists
                const userDoc = await firestore.collection('users').doc(userId).get();
                if (!userDoc.exists) {
                    settingsWithoutUsers.push(userId);
                }
                else {
                    const userData = userDoc.data();
                    if (!(userData === null || userData === void 0 ? void 0 : userData.email)) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Data integrity check failed: ${errorMessage}`);
            throw new Error(`Data integrity check failed: ${errorMessage}`);
        }
    }
    async cleanupOrphanedSettings() {
        this.logger.log('Starting cleanup of orphaned settings...');
        const firestore = this.firebaseService.getFirestore();
        const removedSettings = [];
        const errors = [];
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
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push({ userId, error: errorMessage });
                    this.logger.error(`Failed to remove settings for user ${userId}: ${errorMessage}`);
                }
            }
            this.logger.log(`Cleanup completed: ${removedSettings.length} orphaned settings removed, ${errors.length} errors`);
            return { removedSettings, errors };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Cleanup failed: ${errorMessage}`);
            throw new Error(`Cleanup failed: ${errorMessage}`);
        }
    }
    // Enhanced diagnostic methods
    async getDetailedDatabaseStatus() {
        this.logger.log('Getting detailed database status...');
        const firestore = this.firebaseService.getFirestore();
        try {
            // Get all users
            const usersSnapshot = await firestore.collection('users').get();
            const users = usersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Get all user_settings
            const settingsSnapshot = await firestore.collection('user_settings').get();
            const userSettings = settingsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Get recent delivery_logs (last 20)
            const logsSnapshot = await firestore
                .collection('delivery_logs')
                .orderBy('deliveredAt', 'desc')
                .limit(20)
                .get();
            const deliveryLogs = logsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            return {
                users,
                userSettings,
                deliveryLogs,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to get detailed database status: ${errorMessage}`);
            throw new Error(`Failed to get detailed database status: ${errorMessage}`);
        }
    }
    // Recovery method to restore users collection from existing data
    async recoverUsersFromSettings() {
        this.logger.log('Starting user recovery from settings...');
        const firestore = this.firebaseService.getFirestore();
        const recoveredUsers = [];
        const errors = [];
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
                    }
                    else {
                        this.logger.log(`User ${userId} already exists, skipping`);
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push({ userId, error: errorMessage });
                    this.logger.error(`Failed to recover user ${userId}: ${errorMessage}`);
                }
            }
            this.logger.log(`User recovery completed: ${recoveredUsers.length} users recovered, ${errors.length} errors`);
            return { recoveredUsers, errors };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`User recovery failed: ${errorMessage}`);
            throw new Error(`User recovery failed: ${errorMessage}`);
        }
    }
    // Check specific user data by email
    async checkUserByEmail(email) {
        this.logger.log(`Checking user data for email: ${email}`);
        const firestore = this.firebaseService.getFirestore();
        const auth = this.firebaseService.getAuth();
        const issues = [];
        try {
            // 1. Check Firebase Auth
            let firebaseAuthUser = null;
            let authUid = null;
            try {
                firebaseAuthUser = await auth.getUserByEmail(email);
                authUid = firebaseAuthUser.uid;
            }
            catch (error) {
                issues.push(`Firebase Auth user not found for email: ${email}`);
            }
            // 2. Check Firestore users collection
            let firestoreUser = null;
            let firestoreUserId = null;
            if (authUid) {
                const userDoc = await firestore.collection('users').doc(authUid).get();
                if (userDoc.exists) {
                    firestoreUser = Object.assign({ id: userDoc.id }, userDoc.data());
                    firestoreUserId = userDoc.id;
                }
                else {
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
                    userSettings = Object.assign({ id: settingsQuery.docs[0].id }, settingsData);
                    settingsUserId = settingsData.userId;
                }
            }
            // If not found by authUid, mark as issue
            if (!userSettings) {
                issues.push(`user_settings not found for user`);
            }
            // 4. Check delivery logs (using simple query to avoid index issues)
            let deliveryLogs = [];
            if (authUid) {
                try {
                    const logsQuery = await firestore
                        .collection('delivery_logs')
                        .where('userId', '==', authUid)
                        .limit(10)
                        .get();
                    deliveryLogs = logsQuery.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
                }
                catch (error) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to check user data for ${email}: ${errorMessage}`);
            throw new Error(`Failed to check user data: ${errorMessage}`);
        }
    }
    // Fix user email in Firestore to match Firebase Auth
    async fixUserEmail(authUid, correctEmail) {
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
            const updatedUserData = Object.assign(Object.assign({}, userData), { email: correctEmail, updatedAt: new Date() });
            await firestore.collection('users').doc(authUid).set(updatedUserData);
            this.logger.log(`Updated email for user ${authUid} from ${userData === null || userData === void 0 ? void 0 : userData.email} to ${correctEmail}`);
            return {
                success: true,
                message: `Email updated successfully from ${userData === null || userData === void 0 ? void 0 : userData.email} to ${correctEmail}`,
                updatedUser: updatedUserData
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to fix user email: ${errorMessage}`);
            return {
                success: false,
                message: `Failed to fix user email: ${errorMessage}`,
                updatedUser: null
            };
        }
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = DeliveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService,
        settings_service_1.SettingsService,
        gemini_service_1.GeminiService])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map