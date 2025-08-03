import { Env, UserSetting, DeliveryLog, ApiResponse, JWTPayload } from '../types';
import { DatabaseService } from '../utils/database';
import { GeminiService } from '../utils/gemini';
import { EmailService } from '../utils/email';

export class DeliveryHandler {
  constructor(
    private env: Env, 
    private db: DatabaseService,
    private gemini: GeminiService,
    private email: EmailService
  ) {}

  async instantDelivery(user: JWTPayload, settingId: string): Promise<Response> {
    try {
      const userSettings = await this.db.getUserSettings(user.uid);
      if (!userSettings) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'User settings not found' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const setting = userSettings.settings.find(s => s.id === settingId);
      if (!setting) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Setting not found' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.deliverContent(user.uid, user.email, setting, 'instant');

      const response: ApiResponse = {
        success: true,
        message: 'Instant delivery initiated for setting',
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Instant delivery error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async instantDeliveryAll(user: JWTPayload): Promise<Response> {
    try {
      const userSettings = await this.db.getUserSettings(user.uid);
      if (!userSettings || userSettings.settings.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No settings found' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const results = [];
      for (const setting of userSettings.settings) {
        try {
          await this.deliverContent(user.uid, user.email, setting, 'instant');
          results.push({ settingId: setting.id, status: 'success' });
        } catch (error) {
          results.push({ settingId: setting.id, status: 'failed', error: error.message });
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Instant delivery initiated for all settings',
        data: { results },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Instant delivery all error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async getDeliveryLogs(user: JWTPayload): Promise<Response> {
    try {
      const logs = await this.db.getDeliveryLogs(user.uid);

      const response: ApiResponse<{ logs: DeliveryLog[] }> = {
        success: true,
        data: { logs },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get delivery logs error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
      deliveredAt: new Date().toISOString(),
    };

    try {
      console.log(`Generating content for ${setting.categoryName} (user: ${userId})`);
      
      // Generate content using Gemini
      const content = await this.gemini.generateContent(setting.geminiQuery);
      
      // Send email
      await this.email.sendPersonalizedContent(
        userEmail,
        setting.categoryName,
        content,
      );

      logEntry.status = 'success';
      logEntry.contentSummary = content.substring(0, 100) + '...';
      
      console.log(`Successfully delivered ${setting.categoryName} to ${userEmail}`);
    } catch (error) {
      console.error(`Failed to deliver ${setting.categoryName} to ${userEmail}: ${error.message}`);
      logEntry.status = 'failed';
      logEntry.errorMessage = error.message;
    }

    // Save delivery log
    await this.db.saveDeliveryLog(logEntry as DeliveryLog);
  }

  async handleScheduledDelivery(): Promise<void> {
    console.log('Starting scheduled delivery check...');
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate();

    try {
      // Get all user settings
      const allUserSettings = await this.db.getAllUserSettings();
      
      for (const userSettings of allUserSettings) {
        const userId = userSettings.userId;

        // Get user email
        const user = await this.db.getUser(userId);
        if (!user) {
          console.warn(`User ${userId} not found`);
          continue;
        }

        // Check each setting for delivery
        for (const setting of userSettings.settings) {
          if (this.shouldDeliver(setting, dayOfWeek, dayOfMonth)) {
            await this.deliverContent(userId, user.email, setting, 'scheduled');
          }
        }
      }
    } catch (error) {
      console.error(`Error in scheduled delivery: ${error.message}`);
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
}