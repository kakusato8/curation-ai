import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateContent(query: string): Promise<string> {
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
    } catch (error) {
      this.logger.error(`Error generating content: ${error.message}`);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async generateBatchContent(queries: string[]): Promise<{ query: string; content: string }[]> {
    const results = [];
    
    for (const query of queries) {
      try {
        const content = await this.generateContent(query);
        results.push({ query, content });
      } catch (error) {
        this.logger.error(`Failed to generate content for query "${query}": ${error.message}`);
        results.push({ 
          query, 
          content: `エラーが発生しました: ${error.message}` 
        });
      }
    }
    
    return results;
  }
}