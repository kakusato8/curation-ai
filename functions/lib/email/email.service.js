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
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get('EMAIL_USER') || this.configService.get('email.user'),
                pass: this.configService.get('EMAIL_PASSWORD') || this.configService.get('email.password'),
            },
        });
    }
    async sendEmail(to, subject, content) {
        const mailOptions = {
            from: this.configService.get('EMAIL_USER') || this.configService.get('email.user'),
            to,
            subject,
            html: content,
        };
        try {
            await this.transporter.sendMail(mailOptions);
        }
        catch (error) {
            console.error('Failed to send email:', error);
            throw error;
        }
    }
    async sendPersonalizedContent(userEmail, categoryName, content) {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map