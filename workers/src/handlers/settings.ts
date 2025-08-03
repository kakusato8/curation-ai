import { Env, UserSetting, UserSettings, ApiResponse, JWTPayload } from '../types';
import { DatabaseService } from '../utils/database';

export class SettingsHandler {
  constructor(private env: Env, private db: DatabaseService) {}

  async getSettings(user: JWTPayload): Promise<Response> {
    try {
      const userSettings = await this.db.getUserSettings(user.uid);
      
      const response: ApiResponse<UserSettings | null> = {
        success: true,
        data: userSettings,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get settings error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async createSetting(request: Request, user: JWTPayload): Promise<Response> {
    try {
      const body = await request.json() as Omit<UserSetting, 'id'>;
      
      if (!body.categoryName || !body.geminiQuery || !body.frequency) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Category name, query, and frequency are required' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newSetting = await this.db.addUserSetting(user.uid, body);

      const response: ApiResponse<UserSetting> = {
        success: true,
        data: newSetting,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Create setting error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async updateSetting(request: Request, user: JWTPayload, settingId: string): Promise<Response> {
    try {
      const body = await request.json() as Partial<Omit<UserSetting, 'id'>>;
      
      const updatedSetting = await this.db.updateUserSetting(user.uid, settingId, body);

      const response: ApiResponse<UserSetting> = {
        success: true,
        data: updatedSetting,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Update setting error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), { 
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async deleteSetting(user: JWTPayload, settingId: string): Promise<Response> {
    try {
      await this.db.deleteUserSetting(user.uid, settingId);

      const response: ApiResponse = {
        success: true,
        message: 'Setting deleted successfully',
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Delete setting error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), { 
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}