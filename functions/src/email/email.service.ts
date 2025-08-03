import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER') || this.configService.get('email.user'),
        pass: this.configService.get('EMAIL_PASSWORD') || this.configService.get('email.password'),
      },
    });
  }

  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER') || this.configService.get('email.user'),
      to,
      subject,
      html: content,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendPersonalizedContent(
    userEmail: string,
    categoryName: string,
    content: string,
  ): Promise<void> {
    const subject = `${categoryName} - 最新情報をお届け`;
    const htmlContent = `
      <h2>${categoryName}</h2>
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        ${content}
      </div>
      <hr>
      <p style="color: #666; font-size: 12px;">
        この情報は設定に基づいて自動配信されています。
      </p>
    `;

    await this.sendEmail(userEmail, subject, htmlContent);
  }
}