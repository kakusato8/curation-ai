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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
const uuid_1 = require("uuid");
let SettingsService = class SettingsService {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async getUserSettings(userId) {
        const firestore = this.firebaseService.getFirestore();
        const settingsDoc = await firestore.collection('user_settings').doc(userId).get();
        if (!settingsDoc.exists) {
            // Return empty settings structure instead of null
            return {
                userId,
                settings: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
        return settingsDoc.data();
    }
    async createSetting(userId, createSettingDto) {
        const firestore = this.firebaseService.getFirestore();
        const settingsRef = firestore.collection('user_settings').doc(userId);
        const newSetting = Object.assign({ id: (0, uuid_1.v4)() }, createSettingDto);
        const settingsDoc = await settingsRef.get();
        if (settingsDoc.exists) {
            const currentSettings = settingsDoc.data();
            currentSettings.settings.push(newSetting);
            currentSettings.updatedAt = new Date();
            await settingsRef.update({
                settings: currentSettings.settings,
                updatedAt: currentSettings.updatedAt,
            });
        }
        else {
            const newSettings = {
                userId,
                settings: [newSetting],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await settingsRef.set(newSettings);
        }
        return newSetting;
    }
    async updateSetting(userId, settingId, updateSettingDto) {
        const firestore = this.firebaseService.getFirestore();
        const settingsRef = firestore.collection('user_settings').doc(userId);
        const settingsDoc = await settingsRef.get();
        if (!settingsDoc.exists) {
            throw new common_1.NotFoundException('User settings not found');
        }
        const userSettings = settingsDoc.data();
        const settingIndex = userSettings.settings.findIndex(s => s.id === settingId);
        if (settingIndex === -1) {
            throw new common_1.NotFoundException('Setting not found');
        }
        userSettings.settings[settingIndex] = Object.assign(Object.assign({}, userSettings.settings[settingIndex]), updateSettingDto);
        userSettings.updatedAt = new Date();
        await settingsRef.update({
            settings: userSettings.settings,
            updatedAt: userSettings.updatedAt,
        });
        return userSettings.settings[settingIndex];
    }
    async deleteSetting(userId, settingId) {
        const firestore = this.firebaseService.getFirestore();
        const settingsRef = firestore.collection('user_settings').doc(userId);
        const settingsDoc = await settingsRef.get();
        if (!settingsDoc.exists) {
            throw new common_1.NotFoundException('User settings not found');
        }
        const userSettings = settingsDoc.data();
        userSettings.settings = userSettings.settings.filter(s => s.id !== settingId);
        userSettings.updatedAt = new Date();
        await settingsRef.update({
            settings: userSettings.settings,
            updatedAt: userSettings.updatedAt,
        });
    }
    async getSettingById(userId, settingId) {
        const userSettings = await this.getUserSettings(userId);
        if (!userSettings) {
            throw new common_1.NotFoundException('User settings not found');
        }
        const setting = userSettings.settings.find(s => s.id === settingId);
        if (!setting) {
            throw new common_1.NotFoundException('Setting not found');
        }
        return setting;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map