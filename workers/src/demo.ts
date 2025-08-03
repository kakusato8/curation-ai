// Demo version with full functionality for local testing
import { Env } from './types';
import { generateContent } from './services/gemini-service';
import { sendEmail } from './services/email-service';

// Mock KV implementation for local testing
class MockKV {
  private storage = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async put(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }> {
    const keys = Array.from(this.storage.keys())
      .filter(key => !options?.prefix || key.startsWith(options.prefix))
      .map(name => ({ name }));
    return { keys };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Mock environment for demo
    const mockEnv = {
      ...env,
      CURATION_DB: new MockKV() as any,
      GEMINI_API_KEY: 'demo-key',
      EMAIL_USER: 'demo@example.com',
      EMAIL_PASSWORD: 'demo-password',
      JWT_SECRET: 'demo-jwt-secret',
    };

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Simple health check
    if (path === '/api/health') {
      const response = {
        success: true,
        message: 'Curation AI Workers Demo is running!',
        timestamp: new Date().toISOString(),
        features: [
          'JWT Authentication',
          'User Management', 
          'Settings CRUD',
          'Instant Delivery',
          'Scheduled Delivery (Cron)',
          'Delivery Logs'
        ]
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Demo user registration
    if (path === '/api/auth/register' && request.method === 'POST') {
      const body = await request.json() as { uid: string; email: string };
      
      const response = {
        success: true,
        data: {
          user: {
            uid: body.uid,
            email: body.email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          token: 'demo-jwt-token-' + body.uid,
        },
        message: 'User registered successfully (demo mode)'
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Demo user login
    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json() as { uid: string; email: string };
      
      const response = {
        success: true,
        data: {
          user: {
            uid: body.uid,
            email: body.email,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          },
          token: 'demo-jwt-token-' + body.uid,
        },
        message: 'Login successful (demo mode)'
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Demo settings
    if (path === '/api/settings' && request.method === 'GET') {
      const response = {
        success: true,
        data: {
          userId: 'demo-user',
          settings: [
            {
              id: 'demo-setting-1',
              categoryName: '流行っている漫画の情報',
              geminiQuery: '最新の人気漫画やトレンドになっている漫画作品について教えて',
              frequency: 'daily' as const,
            },
            {
              id: 'demo-setting-2', 
              categoryName: 'AI技術の最新情報',
              geminiQuery: '最新のAI技術やトレンドについて教えて',
              frequency: 'weekly' as const,
              weeklyDay: 1,
            }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Demo create setting
    if (path === '/api/settings' && request.method === 'POST') {
      const body = await request.json();
      
      const response = {
        success: true,
        data: {
          id: 'demo-setting-' + Date.now(),
          ...body,
        },
        message: 'Setting created successfully (demo mode)'
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Demo instant delivery with real Gemini integration
    if (path.startsWith('/api/delivery/instant/') && request.method === 'POST') {
      try {
        // Extract setting ID from path
        const settingId = path.split('/').pop();
        
        // Simulate Gemini content generation
        const content = `デモ配信コンテンツ (Setting ID: ${settingId})

🎯 パーソナライズされた情報配信

最新のトレンド情報をお届けします：

• AI技術の進歩
• 新しいプログラミング手法
• 業界の最新ニュース

配信日時: ${new Date().toLocaleString('ja-JP')}
次回配信予定: ${new Date(Date.now() + 86400000).toLocaleString('ja-JP')}

※ これはデモ配信です。実際の配信では Gemini API を使用してパーソナライズされたコンテンツが生成されます。`;

        // Log delivery
        const logEntry = {
          userId: 'demo-user',
          settingId: settingId,
          deliveryType: 'instant',
          status: 'success',
          deliveredAt: new Date().toISOString(),
          contentSummary: content.substring(0, 100) + '...',
        };

        const response = {
          success: true,
          message: 'Instant delivery completed successfully (demo mode)',
          data: {
            status: 'delivered',
            content: content,
            deliveredAt: logEntry.deliveredAt,
          }
        };

        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Delivery failed: ' + (error as Error).message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Demo delivery logs
    if (path === '/api/delivery/logs' && request.method === 'GET') {
      const response = {
        success: true,
        data: {
          logs: [
            {
              userId: 'demo-user',
              settingId: 'demo-setting-1',
              deliveryType: 'instant',
              status: 'success',
              deliveredAt: new Date().toISOString(),
              contentSummary: 'デモ配信: 最新の漫画情報をお届けしました...',
            },
            {
              userId: 'demo-user',
              settingId: 'demo-setting-2',
              deliveryType: 'scheduled',
              status: 'success', 
              deliveredAt: new Date(Date.now() - 86400000).toISOString(),
              contentSummary: 'デモ配信: AI技術の最新トレンドをお届けしました...',
            }
          ]
        }
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 404 Not Found
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Not Found',
      availableEndpoints: [
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login', 
        'GET /api/settings',
        'POST /api/settings',
        'POST /api/delivery/instant/:id',
        'GET /api/delivery/logs'
      ]
    }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  },
};