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
        var _a;
        this.logger.log('Starting scheduled delivery check...');
        const firestore = this.firebaseService.getFirestore();
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayOfMonth = today.getDate();
        try {
            // Get all user settings
            const settingsSnapshot = await firestore.collection('user_settings').get();
            for (const doc of settingsSnapshot.docs) {
                const userSettings = doc.data();
                const userId = userSettings.userId;
                // Get user email
                const userDoc = await firestore.collection('users').doc(userId).get();
                if (!userDoc.exists) {
                    this.logger.warn(`User ${userId} not found`);
                    continue;
                }
                const userEmail = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
                // Check each setting for delivery
                for (const setting of userSettings.settings) {
                    if (this.shouldDeliver(setting, dayOfWeek, dayOfMonth)) {
                        await this.deliverContent(userId, userEmail, setting, 'scheduled');
                    }
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in scheduled delivery: ${errorMessage}`);
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
            const categoriesSet = new Set();
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
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = DeliveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService,
        settings_service_1.SettingsService,
        gemini_service_1.GeminiService])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map