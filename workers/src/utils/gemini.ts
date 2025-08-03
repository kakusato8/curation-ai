import { Env } from '../types';

export class GeminiService {
  constructor(private env: Env) {}

  async generateContent(query: string): Promise<string> {
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
<h3>${query} - 最新情報</h3>

<h4>トピック1: [タイトル]</h4>
<p>[説明]</p>

<h4>トピック2: [タイトル]</h4>
<p>[説明]</p>

...
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: enhancedPrompt
              }]
            }]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No content generated from Gemini API');
      }

      console.log(`Generated content for query: ${query}`);
      return content;
    } catch (error) {
      console.error(`Error generating content: ${error.message}`);
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
        console.error(`Failed to generate content for query "${query}": ${error.message}`);
        results.push({ 
          query, 
          content: `<p>エラーが発生しました: ${error.message}</p>` 
        });
      }
    }
    
    return results;
  }
}