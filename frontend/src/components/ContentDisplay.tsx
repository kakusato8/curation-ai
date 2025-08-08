import React from 'react';
import { DeliveryContentResponse, BatchDeliveryResponse } from '../utils/api';
import { formatDate } from '../utils/dateUtils';
import MarkdownRenderer from './MarkdownRenderer';

interface ContentDisplayProps {
  content: DeliveryContentResponse | BatchDeliveryResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({
  content,
  loading,
  error,
  onClose,
}) => {
  if (!content && !loading && !error) {
    return null;
  }

  const isBatchResponse = (content: any): content is BatchDeliveryResponse => {
    return content && 'contents' in content;
  };


  return (
    <div className="content-display-overlay">
      <div className="content-display-modal">
        <div className="content-display-header">
          <h3>コンテンツ配信結果</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="content-display-body">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>コンテンツを生成中...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <h4>エラーが発生しました</h4>
              <p>{error}</p>
            </div>
          )}

          {content && !loading && (
            <div className="content-results">
              {isBatchResponse(content) ? (
                // Batch content display
                <div className="batch-content">
                  <div className="batch-summary">
                    <h4>バッチ配信結果</h4>
                    <div className="summary-stats">
                      <span className="stat">
                        総数: {content.totalProcessed}
                      </span>
                      <span className="stat success">
                        成功: {content.successful}
                      </span>
                      <span className="stat failed">
                        失敗: {content.failed}
                      </span>
                    </div>
                    <p className="generated-time">
                      生成日時: {formatDate(content.generatedAt)}
                    </p>
                  </div>

                  {content.errors.length > 0 && (
                    <div className="error-summary">
                      <h5>エラーが発生した設定:</h5>
                      {content.errors.map((error, index) => (
                        <div key={index} className="error-item">
                          <strong>{error.categoryName}</strong>: {error.error}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="content-list">
                    {content.contents
                      .filter(item => item.success)
                      .map((item) => (
                        <div key={item.settingId} className="content-item">
                          <div className="content-header">
                            <h5>{item.categoryName}</h5>
                            <small>クエリ: {item.query}</small>
                          </div>
                          <div className="content-body">
                            <MarkdownRenderer 
                              content={item.content || ''} 
                              className="content-markdown"
                            />
                          </div>
                          <div className="content-footer">
                            <small>生成日時: {formatDate(item.generatedAt)}</small>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                // Single content display
                <div className="single-content">
                  <div className="content-header">
                    <h4>{content.categoryName}</h4>
                    <small>クエリ: {content.query}</small>
                  </div>
                  
                  {content.success ? (
                    <div className="content-body">
                      <MarkdownRenderer 
                        content={content.content || ''} 
                        className="content-markdown"
                      />
                    </div>
                  ) : (
                    <div className="error-state">
                      <h5>コンテンツ生成に失敗しました</h5>
                      <p>{content.error}</p>
                    </div>
                  )}
                  
                  <div className="content-footer">
                    <small>生成日時: {formatDate(content.generatedAt)}</small>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="content-display-footer">
          <button className="btn-secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentDisplay;