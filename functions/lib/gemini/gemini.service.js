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
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const isRetryableError = this.isRetryableError(error);
                if (isLastAttempt || !isRetryableError) {
                    throw error;
                }
                const delayMs = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms: ${errorMessage}`);
                await this.delay(delayMs);
            }
        }
        throw new Error('Max retries exceeded');
    }
    isRetryableError(error) {
        var _a, _b;
        const message = ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        const status = (error === null || error === void 0 ? void 0 : error.status) || ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status);
        return (status === 503 || // Service Unavailable
            status === 429 || // Too Many Requests
            status === 500 || // Internal Server Error
            message.includes('overloaded') ||
            message.includes('temporarily unavailable') ||
            message.includes('rate limit') ||
            message.includes('timeout'));
    }
    async generateContent(query) {
        return this.retryWithBackoff(async () => {
            var _a;
            try {
                const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'];
                let lastError = null;
                for (const modelName of models) {
                    try {
                        this.logger.log(`Attempting content generation with model: ${modelName} for query: ${query.substring(0, 50)}...`);
                        // Use different tool configuration based on model version
                        const isGemini2 = modelName.includes('2.0');
                        const tools = isGemini2 ?
                            [{ googleSearch: {} }] :
                            [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: 'MODE_DYNAMIC', dynamicThreshold: 0.7 } } }];
                        const model = this.genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 8192,
                            },
                            tools,
                            // システム指示を追加してより良い検索結果を得る
                            systemInstruction: {
                                role: 'system',
                                parts: [{
                                        text: `あなたは最新情報検索に特化したAIアシスタントです。以下の重要な指示に従ってください：

1. 質問に関する最新かつ正確な情報を必ずGoogle検索で取得してください
2. 株価、金融データ、ニュース、統計データなどリアルタイム性が重要な情報は必須で検索を実行してください
3. 検索結果に基づいて、信頼性の高い情報のみを使用してください
4. 情報源を明記し、データの信頼性を確保してください
5. 古い情報や推測は避け、検索で得た最新情報のみを使用してください
6. 日本語で回答し、読みやすく構造化された形式で提供してください`
                                    }]
                            }
                        });
                        const enhancedPrompt = `
【最新情報検索クエリ】
${query}

【実行指示】
1. このクエリについて必ずGoogle検索を実行して最新情報を取得してください
2. 特に株価、金融データ、ニュース、統計については必須で検索してください
3. 現在日時: ${new Date().toISOString()}
4. 検索結果を基に以下の形式で回答してください：

## 📊 ${query} - 最新情報
**更新日時**: ${new Date().toLocaleString('ja-JP')}

### 🔍 要約
[検索結果から得られた重要な情報の要約]

### 📈 詳細情報
[具体的なデータ、数値、動向を箇条書きで]

### 📰 最新の動き
[最近のニュースや変化について]

### 🔗 情報源
[検索で参照した信頼性の高い情報源]

**注意**: この情報は検索時点（${new Date().toLocaleString('ja-JP')}）のものです。
            `;
                        const result = await model.generateContent(enhancedPrompt);
                        const response = await result.response;
                        // グラウンディングメタデータの処理
                        let groundingInfo = '';
                        if (response.candidates && response.candidates[0]) {
                            const candidate = response.candidates[0];
                            // グラウンディング情報を安全に取得
                            const groundingMetadata = candidate.groundingMetadata;
                            if (groundingMetadata) {
                                this.logger.log(`Grounding metadata available with ${((_a = groundingMetadata.searchEntryPoints) === null || _a === void 0 ? void 0 : _a.length) || 0} search entries`);
                                // 検索結果の詳細情報をログに記録
                                if (groundingMetadata.searchEntryPoints) {
                                    groundingInfo = this.formatGroundingMetadata(groundingMetadata);
                                    this.logger.log(`Search grounding successful: ${groundingMetadata.searchEntryPoints.length} sources found`);
                                }
                            }
                        }
                        const text = response.text();
                        // 検索が実行されなかった場合のフォールバック
                        if (!text.includes('検索') && !groundingInfo) {
                            this.logger.warn(`No grounding detected for query: ${query}, attempting fallback`);
                            throw new Error('Search grounding not executed properly');
                        }
                        this.logger.log(`Successfully generated content with ${modelName} and grounding for query: ${query}`);
                        return text + (groundingInfo ? `\n\n---\n### 検索実行情報\n${groundingInfo}` : '');
                    }
                    catch (modelError) {
                        lastError = modelError;
                        const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
                        this.logger.warn(`Model ${modelName} failed: ${errorMessage}`);
                        // Google Search関連のエラーをより詳細に処理
                        if (errorMessage.includes('BLOCKED') || errorMessage.includes('SAFETY')) {
                            this.logger.error(`Content blocked or safety issue with ${modelName}: ${errorMessage}`);
                            continue;
                        }
                        if (errorMessage.includes('googleSearch') || errorMessage.includes('grounding')) {
                            this.logger.error(`Google Search grounding issue with ${modelName}: ${errorMessage}`);
                            // 次のモデルを試す前にGoogleSearchなしでフォールバック
                            if (models.indexOf(modelName) < models.length - 1) {
                                continue;
                            }
                        }
                        if (!this.isRetryableError(modelError)) {
                            this.logger.error(`Non-retryable error with ${modelName}: ${errorMessage}`);
                            continue;
                        }
                        if (models.indexOf(modelName) === models.length - 1) {
                            throw modelError;
                        }
                    }
                }
                throw lastError || new Error('All models failed');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Error generating content: ${errorMessage}`);
                // Google Search Grounding が利用できない場合のフォールバック
                if (errorMessage.includes('googleSearch') || errorMessage.includes('grounding')) {
                    this.logger.warn('Google Search Grounding failed, attempting without grounding...');
                    return this.generateContentWithoutGrounding(query);
                }
                throw new Error(`Failed to generate content: ${errorMessage}`);
            }
        });
    }
    formatGroundingMetadata(metadata) {
        if (!metadata.searchEntryPoints)
            return '';
        const sources = metadata.searchEntryPoints
            .slice(0, 5) // 最大5個のソースを表示
            .map((entry, index) => {
            const title = entry.renderedContent || 'タイトル不明';
            const url = entry.sdkBlob || 'URL不明';
            return `${index + 1}. [${title}](${url})`;
        })
            .join('\n');
        return `以下のソースから情報を取得しました:\n${sources}`;
    }
    async generateContentWithoutGrounding(query) {
        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash-002',
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            });
            const fallbackPrompt = `
クエリ: ${query}

【注意】リアルタイム検索機能が利用できないため、一般的な知識ベースで回答します。
最新の株価、ニュース、統計データについては、信頼できる情報源で最新情報をご確認ください。

上記のクエリについて、利用可能な知識に基づいて詳しく説明してください。
ただし、リアルタイム情報が必要な場合は、その旨を明記してください。
      `;
            const result = await model.generateContent(fallbackPrompt);
            const response = await result.response;
            const text = response.text();
            return text + '\n\n**注意**: この回答はリアルタイム検索なしで生成されました。最新情報については公式ソースをご確認ください。';
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Fallback content generation failed: ${errorMessage}`);
            throw new Error(`フォールバック処理も失敗しました: ${errorMessage}`);
        }
    }
    async generateBatchContent(queries) {
        const results = [];
        const maxConcurrent = 3; // Limit concurrent requests to avoid overloading
        for (let i = 0; i < queries.length; i += maxConcurrent) {
            const batch = queries.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(async (query) => {
                try {
                    const content = await this.generateContent(query);
                    return { query, content };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to generate content for query "${query}": ${errorMessage}`);
                    return {
                        query,
                        content: `エラーが発生しました: ${errorMessage}`
                    };
                }
            });
            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    this.logger.error(`Batch processing failed: ${result.reason}`);
                }
            });
            // Add delay between batches to avoid rate limiting
            if (i + maxConcurrent < queries.length) {
                await this.delay(2000);
            }
        }
        return results;
    }
    // Google Search Groundingに特化したメソッド
    async generateContentWithGrounding(query, options) {
        const { forceSearch = true, searchThreshold = 0.7, includeMetadata = true } = options || {};
        return this.retryWithBackoff(async () => {
            var _a, _b;
            try {
                // より確実に検索を実行するためgemini-2.0-flash-expを優先使用
                const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash-002'];
                for (const modelName of models) {
                    try {
                        this.logger.log(`Attempting grounded generation with ${modelName} for: ${query.substring(0, 50)}...`);
                        // Use different tool configuration based on model version
                        const isGemini2 = modelName.includes('2.0');
                        const tools = isGemini2 ?
                            [{ googleSearch: {} }] :
                            [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: 'MODE_DYNAMIC', dynamicThreshold: searchThreshold } } }];
                        const model = this.genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                temperature: 0.3, // 検索結果の精度を上げるため低めに設定
                                topK: 40,
                                topP: 0.9,
                                maxOutputTokens: 8192,
                            },
                            tools,
                            systemInstruction: {
                                role: 'system',
                                parts: [{
                                        text: `あなたは専門的な情報検索アシスタントです。
必ず以下を実行してください：
1. クエリに関連する最新情報をGoogle検索で取得する
2. 株価、金融データ、ニュース、統計データは必須で検索する
3. 複数の信頼できるソースから情報を収集する
4. 検索結果のみに基づいて回答する
5. 推測や古い情報は使用しない`
                                    }]
                            }
                        });
                        // より強制的に検索を実行するプロンプト
                        const searchPrompt = forceSearch ?
                            `【必須検索実行】${query}\n\n上記について必ずGoogle検索を実行してください。検索なしでの回答は禁止です。現在時刻: ${new Date().toISOString()}` :
                            query;
                        const result = await model.generateContent(searchPrompt);
                        const response = await result.response;
                        const text = response.text();
                        // グラウンディングメタデータの確認
                        const groundingMetadata = ((_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) ? response.candidates[0].groundingMetadata : null;
                        const hasGrounding = ((_b = groundingMetadata === null || groundingMetadata === void 0 ? void 0 : groundingMetadata.searchEntryPoints) === null || _b === void 0 ? void 0 : _b.length) > 0;
                        if (forceSearch && !hasGrounding) {
                            this.logger.warn(`No grounding metadata found for ${modelName}, trying next model`);
                            if (models.indexOf(modelName) < models.length - 1) {
                                continue;
                            }
                            throw new Error('Failed to execute Google Search grounding');
                        }
                        this.logger.log(`Successful grounded generation with ${modelName}: ${hasGrounding ? groundingMetadata.searchEntryPoints.length : 0} sources`);
                        return Object.assign({ content: text }, (includeMetadata && hasGrounding && { groundingMetadata }));
                    }
                    catch (modelError) {
                        const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
                        this.logger.warn(`Grounded generation failed with ${modelName}: ${errorMessage}`);
                        if (models.indexOf(modelName) === models.length - 1) {
                            throw modelError;
                        }
                    }
                }
                throw new Error('All models failed for grounded generation');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Google Search Grounding failed: ${errorMessage}`);
                throw error;
            }
        });
    }
    // 株価やリアルタイムデータ専用のメソッド
    async getRealtimeData(symbol, dataType = 'stock') {
        const queries = {
            stock: `${symbol} 株価 現在 リアルタイム 最新`,
            crypto: `${symbol} 仮想通貨 価格 現在 リアルタイム`,
            forex: `${symbol} 為替レート 現在 リアルタイム`,
            news: `${symbol} ニュース 最新 今日`
        };
        const query = queries[dataType];
        this.logger.log(`Getting realtime ${dataType} data for: ${symbol}`);
        try {
            const result = await this.generateContentWithGrounding(query, {
                forceSearch: true,
                searchThreshold: 0.8,
                includeMetadata: true
            });
            return result.content;
        }
        catch (error) {
            this.logger.error(`Failed to get realtime data for ${symbol}: ${error}`);
            throw new Error(`リアルタイムデータの取得に失敗しました: ${symbol}`);
        }
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map