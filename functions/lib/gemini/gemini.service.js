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
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
let GeminiService = GeminiService_1 = class GeminiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GeminiService_1.name);
        const apiKey = this.configService.get('GEMINI_API_KEY') ||
            this.configService.get('gemini.api_key');
        if (!apiKey) {
            this.logger.error('GEMINI_API_KEY is not configured');
            throw new Error('GEMINI_API_KEY is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async generateContent(query) {
        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
            const enhancedPrompt = `
以下のクエリに基づいて、最新の情報を収集し、メールで配信するのに適した形式で整理してください。
情報は日本語で、要約形式で提供してください。

クエリ: ${query}

要求事項:
- 最新の情報を含める
- 読みやすい形式で整理
- 重要なポイントを強調
- 3-5個の主要なトピックに絞る
- 各トピックに簡潔な説明を含める

出力形式:
# ${query} - 最新情報

## トピック1: [タイトル]
[説明]

## トピック2: [タイトル]
[説明]

...
      `;
            const result = await model.generateContent(enhancedPrompt);
            const response = await result.response;
            const text = response.text();
            this.logger.log(`Generated content for query: ${query}`);
            return text;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error generating content: ${errorMessage}`);
            throw new Error(`Failed to generate content: ${errorMessage}`);
        }
    }
    async generateBatchContent(queries) {
        const results = [];
        for (const query of queries) {
            try {
                const content = await this.generateContent(query);
                results.push({ query, content });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to generate content for query "${query}": ${errorMessage}`);
                results.push({
                    query,
                    content: `エラーが発生しました: ${errorMessage}`
                });
            }
        }
        return results;
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map