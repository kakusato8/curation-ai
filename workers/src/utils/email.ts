import { Env } from '../types';

export class EmailService {
  constructor(private env: Env) {}

  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    // Using EmailJS API or similar service for Cloudflare Workers
    // Note: This is a simplified implementation
    // For production, consider using EmailJS, Resend, or similar service
    
    const emailData = {
      from: this.env.EMAIL_USER,
      to,
      subject,
      html: content,
    };

    // For now, we'll use a webhook or external email service
    // This would need to be replaced with actual email service integration
    console.log('Email would be sent:', emailData);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async sendPersonalizedContent(
    userEmail: string,
    categoryName: string,
    content: string,
  ): Promise<void> {
    const subject = `${categoryName} - 最新情報をお届け`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
          ${categoryName}
        </h2>
        <div style="line-height: 1.6; color: #555;">
          ${content}
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          この情報は設定に基づいて自動配信されています。<br>
          個人情報配信システム
        </p>
      </div>
    `;

    await this.sendEmail(userEmail, subject, htmlContent);
  }
}