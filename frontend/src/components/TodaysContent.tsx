import React from 'react';
import { useTodaysContent } from '../hooks/useTodaysContent';
import { formatDate } from '../utils/dateUtils';
import MarkdownRenderer from './MarkdownRenderer';
import { DeliveryLog } from '../utils/api';

interface TodaysContentProps {
  onContentClick?: (content: DeliveryLog) => void;
}

export const TodaysContent: React.FC<TodaysContentProps> = ({ onContentClick }) => {
  const { content, loading, error, refresh } = useTodaysContent();

  if (loading) {
    return (
      <div className="todays-content">
        <div className="todays-content-header">
          <h3>本日の配信コンテンツ</h3>
        </div>
        <div className="todays-content-loading">
          <div className="loading-spinner"></div>
          <p>本日のコンテンツを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="todays-content">
        <div className="todays-content-header">
          <h3>本日の配信コンテンツ</h3>
          <button onClick={refresh} className="refresh-btn">
            ↻ 更新
          </button>
        </div>
        <div className="todays-content-error">
          <p>エラーが発生しました: {error}</p>
          <button onClick={refresh} className="btn-primary">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="todays-content">
        <div className="todays-content-header">
          <h3>本日の配信コンテンツ</h3>
          <button onClick={refresh} className="refresh-btn">
            ↻ 更新
          </button>
        </div>
        <div className="todays-content-empty">
          <p>本日はまだコンテンツが配信されていません</p>
          <div className="debug-info" style={{fontSize: '0.8em', color: '#666', marginTop: '10px'}}>
            <p>デバッグ情報: ブラウザの開発者ツール (F12) のコンソールを確認してください</p>
            <p>コンテンツを生成するには「設定」タブでカテゴリを作成し、「即座に配信」をお試しください</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="todays-content">
      <div className="todays-content-header">
        <h3>本日の配信コンテンツ</h3>
        <div className="header-actions">
          <span className="content-count">{content.length}件</span>
          <button onClick={refresh} className="refresh-btn">
            ↻ 更新
          </button>
        </div>
      </div>
      
      <div className="todays-content-list">
        {content.map((item, index) => (
          <div 
            key={item.id || index} 
            className="todays-content-item"
            onClick={() => onContentClick?.(item)}
          >
            <div className="content-item-header">
              <h4 className="content-category">{item.categoryName}</h4>
              <span className="content-time">{formatDate(item.deliveredAt)}</span>
            </div>
            
            <div className="content-item-body">
              <MarkdownRenderer 
                content={item.fullContent || item.contentSummary || ''}
                className="content-markdown"
              />
            </div>
            
            {item.geminiQuery && (
              <div className="content-item-query">
                <details>
                  <summary>生成に使用したクエリを表示</summary>
                  <p>{item.geminiQuery}</p>
                </details>
              </div>
            )}
            
            <div className="content-item-actions">
              <button 
                className="copy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(item.fullContent || item.contentSummary || '');
                }}
              >
                コピー
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};