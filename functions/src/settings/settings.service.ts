import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UserSettings, UserSetting } from '../common/interfaces/user-setting.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SettingsService {
  constructor(private firebaseService: FirebaseService) {}

  async getUserSettings(userId: string): Promise<UserSettings> {
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
    
    const userSettings = settingsDoc.data() as UserSettings;
    // Sort settings by displayOrder, then by creation order
    userSettings.settings.sort((a, b) => {
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== undefined) return -1;
      if (b.displayOrder !== undefined) return 1;
      return 0;
    });
    
    return userSettings;
  }

  async createSetting(userId: string, createSettingDto: CreateSettingDto): Promise<UserSetting> {
    const firestore = this.firebaseService.getFirestore();
    const settingsRef = firestore.collection('user_settings').doc(userId);
    
    const settingsDoc = await settingsRef.get();
    let nextDisplayOrder = 0;
    
    if (settingsDoc.exists) {
      const currentSettings = settingsDoc.data() as UserSettings;
      nextDisplayOrder = Math.max(...currentSettings.settings.map(s => s.displayOrder || 0), -1) + 1;
    }
    
    const newSetting: UserSetting = {
      id: uuidv4(),
      ...createSettingDto,
      displayOrder: nextDisplayOrder,
    };

    if (settingsDoc.exists) {
      const currentSettings = settingsDoc.data() as UserSettings;
      currentSettings.settings.push(newSetting);
      currentSettings.updatedAt = new Date();
      await settingsRef.update({
        settings: currentSettings.settings,
        updatedAt: currentSettings.updatedAt,
      });
    } else {
      const newSettings: UserSettings = {
        userId,
        settings: [newSetting],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await settingsRef.set(newSettings);
    }

    return newSetting;
  }

  async updateSetting(userId: string, settingId: string, updateSettingDto: UpdateSettingDto): Promise<UserSetting> {
    const firestore = this.firebaseService.getFirestore();
    const settingsRef = firestore.collection('user_settings').doc(userId);
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      throw new NotFoundException('User settings not found');
    }

    const userSettings = settingsDoc.data() as UserSettings;
    const settingIndex = userSettings.settings.findIndex(s => s.id === settingId);
    
    if (settingIndex === -1) {
      throw new NotFoundException('Setting not found');
    }

    userSettings.settings[settingIndex] = {
      ...userSettings.settings[settingIndex],
      ...updateSettingDto,
    };
    userSettings.updatedAt = new Date();

    await settingsRef.update({
      settings: userSettings.settings,
      updatedAt: userSettings.updatedAt,
    });
    return userSettings.settings[settingIndex];
  }

  async deleteSetting(userId: string, settingId: string): Promise<void> {
    const firestore = this.firebaseService.getFirestore();
    const settingsRef = firestore.collection('user_settings').doc(userId);
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      throw new NotFoundException('User settings not found');
    }

    const userSettings = settingsDoc.data() as UserSettings;
    userSettings.settings = userSettings.settings.filter(s => s.id !== settingId);
    userSettings.updatedAt = new Date();

    await settingsRef.update({
      settings: userSettings.settings,
      updatedAt: userSettings.updatedAt,
    });
  }

  async getSettingById(userId: string, settingId: string): Promise<UserSetting> {
    const userSettings = await this.getUserSettings(userId);
    
    if (!userSettings) {
      throw new NotFoundException('User settings not found');
    }

    const setting = userSettings.settings.find(s => s.id === settingId);
    
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    return setting;
  }

  async reorderSettings(userId: string, settingIds: string[]): Promise<UserSettings> {
    const firestore = this.firebaseService.getFirestore();
    const settingsRef = firestore.collection('user_settings').doc(userId);
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      throw new NotFoundException('User settings not found');
    }

    const userSettings = settingsDoc.data() as UserSettings;
    
    // Update displayOrder based on the provided order
    settingIds.forEach((settingId, index) => {
      const setting = userSettings.settings.find(s => s.id === settingId);
      if (setting) {
        setting.displayOrder = index;
      }
    });

    userSettings.updatedAt = new Date();

    await settingsRef.update({
      settings: userSettings.settings,
      updatedAt: userSettings.updatedAt,
    });

    return await this.getUserSettings(userId);
  }
}