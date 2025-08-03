import { Env, User, UserSettings, UserSetting, DeliveryLog } from '../types';

export class DatabaseService {
  constructor(private env: Env) {}

  // User operations
  async createUser(user: User): Promise<void> {
    await this.env.CURATION_DB.put(`user:${user.uid}`, JSON.stringify(user));
  }

  async getUser(uid: string): Promise<User | null> {
    const data = await this.env.CURATION_DB.get(`user:${uid}`);
    return data ? JSON.parse(data) : null;
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    const existing = await this.getUser(uid);
    if (!existing) throw new Error('User not found');
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await this.env.CURATION_DB.put(`user:${uid}`, JSON.stringify(updated));
  }

  // User Settings operations
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const data = await this.env.CURATION_DB.get(`settings:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async createOrUpdateUserSettings(userSettings: UserSettings): Promise<void> {
    userSettings.updatedAt = new Date().toISOString();
    await this.env.CURATION_DB.put(`settings:${userSettings.userId}`, JSON.stringify(userSettings));
  }

  async addUserSetting(userId: string, setting: Omit<UserSetting, 'id'>): Promise<UserSetting> {
    const newSetting: UserSetting = {
      id: crypto.randomUUID(),
      ...setting,
    };

    let userSettings = await this.getUserSettings(userId);
    
    if (!userSettings) {
      userSettings = {
        userId,
        settings: [newSetting],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      userSettings.settings.push(newSetting);
      userSettings.updatedAt = new Date().toISOString();
    }

    await this.createOrUpdateUserSettings(userSettings);
    return newSetting;
  }

  async updateUserSetting(userId: string, settingId: string, updates: Partial<Omit<UserSetting, 'id'>>): Promise<UserSetting> {
    const userSettings = await this.getUserSettings(userId);
    if (!userSettings) throw new Error('User settings not found');

    const settingIndex = userSettings.settings.findIndex(s => s.id === settingId);
    if (settingIndex === -1) throw new Error('Setting not found');

    userSettings.settings[settingIndex] = {
      ...userSettings.settings[settingIndex],
      ...updates,
    };

    await this.createOrUpdateUserSettings(userSettings);
    return userSettings.settings[settingIndex];
  }

  async deleteUserSetting(userId: string, settingId: string): Promise<void> {
    const userSettings = await this.getUserSettings(userId);
    if (!userSettings) throw new Error('User settings not found');

    userSettings.settings = userSettings.settings.filter(s => s.id !== settingId);
    await this.createOrUpdateUserSettings(userSettings);
  }

  async getUserSetting(userId: string, settingId: string): Promise<UserSetting> {
    const userSettings = await this.getUserSettings(userId);
    if (!userSettings) throw new Error('User settings not found');

    const setting = userSettings.settings.find(s => s.id === settingId);
    if (!setting) throw new Error('Setting not found');

    return setting;
  }

  // Delivery Log operations
  async saveDeliveryLog(log: DeliveryLog): Promise<void> {
    const logId = crypto.randomUUID();
    await this.env.CURATION_DB.put(`log:${log.userId}:${logId}`, JSON.stringify(log));
  }

  async getDeliveryLogs(userId: string, limit: number = 50): Promise<DeliveryLog[]> {
    const logs: DeliveryLog[] = [];
    const listResult = await this.env.CURATION_DB.list({ prefix: `log:${userId}:` });
    
    // Sort by key (which includes timestamp) and take latest
    const sortedKeys = listResult.keys
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, limit);

    for (const key of sortedKeys) {
      const data = await this.env.CURATION_DB.get(key.name);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }

    return logs.sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime());
  }

  // Get all users for scheduled delivery
  async getAllUsers(): Promise<User[]> {
    const users: User[] = [];
    const listResult = await this.env.CURATION_DB.list({ prefix: 'user:' });
    
    for (const key of listResult.keys) {
      const data = await this.env.CURATION_DB.get(key.name);
      if (data) {
        users.push(JSON.parse(data));
      }
    }

    return users;
  }

  // Get all user settings for scheduled delivery
  async getAllUserSettings(): Promise<UserSettings[]> {
    const settingsList: UserSettings[] = [];
    const listResult = await this.env.CURATION_DB.list({ prefix: 'settings:' });
    
    for (const key of listResult.keys) {
      const data = await this.env.CURATION_DB.get(key.name);
      if (data) {
        settingsList.push(JSON.parse(data));
      }
    }

    return settingsList;
  }
}