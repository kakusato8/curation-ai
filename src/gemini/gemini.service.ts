import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 
                   this.configService.get<string>('gemini.api_key');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
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

  private isRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.response?.status;
    
    return (
      status === 503 || // Service Unavailable
      status === 429 || // Too Many Requests
      status === 500 || // Internal Server Error
      message.includes('overloaded') ||
      message.includes('temporarily unavailable') ||
      message.includes('rate limit') ||
      message.includes('timeout')
    );
  }

  async generateContent(query: string): Promise<string> {
    return this.retryWithBackoff(async () => {
      try {
        const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        let lastError: Error | null = null;
        
        for (const modelName of models) {
          try {
            this.logger.log(`Attempting content generation with model: ${modelName} for query: ${query.substring(0, 50)}...`);
            
            const model = this.genAI.getGenerativeModel({ 
              model: modelName,          
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              },
            });
            
            const enhancedPrompt = `
【重要】このクエリについて、最新のリアルタイム情報をウェブ検索で収集し、メールで配信するのに適した形式で整理してください。
情報は日本語で、要約形式で提供してください。

クエリ: ${query}

要求事項:
- 現在の最新情報をウェブから検索して収集する
- 今日の日付（${new Date().toLocaleDateString('ja-JP')}）時点での情報を含める
- 読みやすい形式で整理
- 重要なポイントを強調
- 5-8個の主要なトピックに分けて詳細に説明
- 各トピックに詳しい説明と背景情報を含める
- 十分な情報量を確保する（短すぎる要約は避ける）
- 可能であれば情報源を明記する

出力形式:
# ${query} - 最新情報（${new Date().toLocaleDateString('ja-JP')}更新）

## トピック1: [タイトル]
[説明]
[情報源: 参考URL等]

## トピック2: [タイトル]
[説明]
[情報源: 参考URL等]

...
            `;

            const result = await model.generateContent(enhancedPrompt);
            const response = await result.response;
            const text = response.text();
            
            this.logger.log(`Successfully generated content with ${modelName} for query: ${query}`);
            return text;
          } catch (modelError) {
            lastError = modelError as Error;
            const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
            this.logger.warn(`Model ${modelName} failed: ${errorMessage}`);
            
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error generating content: ${errorMessage}`);
        throw new Error(`Failed to generate content: ${errorMessage}`);
      }
    });
  }

  async generateBatchContent(queries: string[]): Promise<{ query: string; content: string }[]> {
    const results: { query: string; content: string }[] = [];
    const maxConcurrent = 3; // Limit concurrent requests to avoid overloading
    
    for (let i = 0; i < queries.length; i += maxConcurrent) {
      const batch = queries.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (query) => {
        try {
          const content = await this.generateContent(query);
          return { query, content };
        } catch (error) {
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
        } else {
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
}