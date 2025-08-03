import { Env, User, ApiResponse } from '../types';
import { DatabaseService } from '../utils/database';
import { JWT } from '../utils/auth';

export class AuthHandler {
  constructor(private env: Env, private db: DatabaseService) {}

  async register(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { uid: string; email: string };
      
      if (!body.uid || !body.email) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'UID and email are required' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user already exists
      const existingUser = await this.db.getUser(body.uid);
      if (existingUser) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'User already exists' 
        }), { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const user: User = {
        uid: body.uid,
        email: body.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.db.createUser(user);

      // Generate JWT token
      const token = await JWT.sign(
        { uid: user.uid, email: user.email },
        this.env.JWT_SECRET
      );

      const response: ApiResponse<{ user: User; token: string }> = {
        success: true,
        data: { user, token },
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async login(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { uid: string; email: string };
      
      if (!body.uid || !body.email) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'UID and email are required' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const user = await this.db.getUser(body.uid);
      if (!user || user.email !== body.email) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate JWT token
      const token = await JWT.sign(
        { uid: user.uid, email: user.email },
        this.env.JWT_SECRET
      );

      const response: ApiResponse<{ user: User; token: string }> = {
        success: true,
        data: { user, token },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async logout(request: Request): Promise<Response> {
    // For JWT, logout is handled client-side by removing the token
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}