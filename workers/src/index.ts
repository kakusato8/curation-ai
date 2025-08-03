import { Env } from './types';
import { DatabaseService } from './utils/database';
import { GeminiService } from './utils/gemini';
import { EmailService } from './utils/email';
import { validateAuth } from './utils/auth';
import { AuthHandler } from './handlers/auth';
import { SettingsHandler } from './handlers/settings';
import { DeliveryHandler } from './handlers/delivery';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Initialize services
      const db = new DatabaseService(env);
      const gemini = new GeminiService(env);
      const email = new EmailService(env);
      const authHandler = new AuthHandler(env, db);
      const settingsHandler = new SettingsHandler(env, db);
      const deliveryHandler = new DeliveryHandler(env, db, gemini, email);

      // Routes that don't require authentication
      if (path === '/api/auth/register' && request.method === 'POST') {
        const response = await authHandler.register(request);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (path === '/api/auth/login' && request.method === 'POST') {
        const response = await authHandler.login(request);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (path === '/api/auth/logout' && request.method === 'POST') {
        const response = await authHandler.logout(request);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Routes that require authentication
      let user;
      try {
        user = await validateAuth(request, env);
      } catch (error) {
        const response = new Response(JSON.stringify({ 
          success: false, 
          error: 'Unauthorized' 
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        return response;
      }

      // Settings routes
      if (path === '/api/settings' && request.method === 'GET') {
        const response = await settingsHandler.getSettings(user);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (path === '/api/settings' && request.method === 'POST') {
        const response = await settingsHandler.createSetting(request, user);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (path.startsWith('/api/settings/') && request.method === 'PUT') {
        const settingId = path.split('/')[3];
        const response = await settingsHandler.updateSetting(request, user, settingId);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (path.startsWith('/api/settings/') && request.method === 'DELETE') {
        const settingId = path.split('/')[3];
        const response = await settingsHandler.deleteSetting(user, settingId);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Delivery routes
      if (path.startsWith('/api/delivery/instant/') && request.method === 'POST') {
        const parts = path.split('/');
        if (parts[4] === 'all') {
          const response = await deliveryHandler.instantDeliveryAll(user);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          return response;
        } else {
          const settingId = parts[4];
          const response = await deliveryHandler.instantDelivery(user, settingId);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          return response;
        }
      }

      if (path === '/api/delivery/logs' && request.method === 'GET') {
        const response = await deliveryHandler.getDeliveryLogs(user);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // 404 Not Found
      const response = new Response(JSON.stringify({ 
        success: false, 
        error: 'Not Found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
      return response;

    } catch (error) {
      console.error('Unhandled error:', error);
      const response = new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal Server Error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
      return response;
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // This function is called when the cron trigger fires
    console.log('Cron trigger fired at:', new Date().toISOString());
    
    const db = new DatabaseService(env);
    const gemini = new GeminiService(env);
    const email = new EmailService(env);
    const deliveryHandler = new DeliveryHandler(env, db, gemini, email);

    await deliveryHandler.handleScheduledDelivery();
  },
};