import React from 'react'
import { DeliveryLog } from '../../utils/api'
import { formatDate } from '../../utils/dateUtils'
import MarkdownRenderer from '../MarkdownRenderer'

interface ContentDetailProps {
  content: DeliveryLog
  onClose: () => void
  onBack?: () => void
}

export const ContentDetail: React.FC<ContentDetailProps> = ({
  content,
  onClose,
  onBack
}) => {
  const handleCopyContent = () => {
    if (content.fullContent) {
      navigator.clipboard.writeText(content.fullContent)
    }
  }

  return (
    <div className="content-archive-overlay">
      <div className="content-archive-modal large">
        <div className="content-archive-header">
          <h3>コンテンツ詳細</h3>
          <div className="header-buttons">
            {onBack && (
              <button 
                className="btn-secondary"
                onClick={onBack}
              >
                戻る
              </button>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="content-archive-body">
          <div className="content-detail">
            <div className="content-detail-header">
              <h4>{content.categoryName}</h4>
              <div className="content-meta">
                <span className="delivery-date">
                  配信日時: {formatDate(content.deliveredAt)}
                </span>
                {content.generatedAt && (
                  <span className="generated-date">
                    生成日時: {formatDate(content.generatedAt)}
                  </span>
                )}
              </div>
            </div>

            {content.geminiQuery && (
              <div className="content-query">
                <h5>生成クエリ:</h5>
                <p className="query-text">{content.geminiQuery}</p>
              </div>
            )}

            <div className="content-body-full">
              <h5>コンテンツ全文:</h5>
              <div className="content-text">
                <MarkdownRenderer 
                  content={content.fullContent || ''} 
                  className="content-markdown"
                />
              </div>
            </div>

            <div className="content-actions">
              <button 
                className="btn-primary"
                onClick={handleCopyContent}
              >
                コピー
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}