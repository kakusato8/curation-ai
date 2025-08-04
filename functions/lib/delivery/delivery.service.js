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
const email_service_1 = require("../email/email.service");
let DeliveryService = DeliveryService_1 = class DeliveryService {
    constructor(firebaseService, settingsService, geminiService, emailService) {
        this.firebaseService = firebaseService;
        this.settingsService = settingsService;
        this.geminiService = geminiService;
        this.emailService = emailService;
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
            deliveryType,
            deliveredAt: new Date(),
        };
        try {
            this.logger.log(`Generating content for ${setting.categoryName} (user: ${userId})`);
            // Generate content using Gemini
            const content = await this.geminiService.generateContent(setting.geminiQuery);
            // Send email
            await this.emailService.sendPersonalizedContent(userEmail, setting.categoryName, content);
            logEntry.status = 'success';
            logEntry.contentSummary = content.substring(0, 100) + '...';
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
    async getDeliveryLogs(userId, limit = 50) {
        const firestore = this.firebaseService.getFirestore();
        const logsSnapshot = await firestore
            .collection('delivery_logs')
            .where('userId', '==', userId)
            .orderBy('deliveredAt', 'desc')
            .limit(limit)
            .get();
        return logsSnapshot.docs.map(doc => doc.data());
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = DeliveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService,
        settings_service_1.SettingsService,
        gemini_service_1.GeminiService,
        email_service_1.EmailService])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map