import React, { useState, useEffect } from 'react';
import { apiClient, DeliveryLog, DeliveryLogsFilters } from '../utils/api';
import { formatDate } from '../utils/dateUtils';
import MarkdownRenderer from './MarkdownRenderer';

interface DeliveryHistoryProps {
  onClose: () => void;
  categoryName?: string;
}

const DeliveryHistory: React.FC<DeliveryHistoryProps> = ({ onClose, categoryName }) => {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<DeliveryLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced filter states
  const [filters, setFilters] = useState<DeliveryLogsFilters>({
    limit: 50,
    sortBy: 'deliveredAt',
    sortOrder: 'desc'
  });
  
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<'all' | 'scheduled' | 'instant'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    loadDeliveryHistory();
  }, [categoryName]);

  const loadDeliveryHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filterOptions: DeliveryLogsFilters = {
        ...filters,
        categoryName: categoryName || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        deliveryType: selectedDeliveryType !== 'all' ? selectedDeliveryType : undefined,
        searchText: searchText.trim() || undefined,
        startDate: dateRange.start ? new Date(dateRange.start) : undefined,
        endDate: dateRange.end ? new Date(dateRange.end) : undefined,
      };
      
      let response;
      if (categoryName) {
        // For specific category, still use the legacy endpoint but with enhanced filtering
        response = await apiClient.getDeliveryHistory(categoryName, filterOptions.limit || 50);
        setLogs(response.history);
      } else {
        // Use the enhanced logs endpoint
        response = await apiClient.getDeliveryLogs(filterOptions);
        setLogs(response.logs);
      }
    } catch (err) {
      setError('配信履歴の取得に失敗しました');
      console.error('Failed to load delivery history:', err);
    } finally {
      setLoading(false);
    }
  };

  const openLogDetail = async (logId: string) => {
    try {
      const response = await apiClient.getDeliveryLogDetail(logId);
      setSelectedLog(response.log);
    } catch (err) {
      console.error('Failed to load log detail:', err);
    }
  };

  
  const applyFilters = () => {
    loadDeliveryHistory();
  };
  
  const clearFilters = () => {
    setSearchText('');
    setSelectedStatus('all');
    setSelectedDeliveryType('all');
    setDateRange({ start: '', end: '' });
    setFilters({
      limit: 50,
      sortBy: 'deliveredAt',
      sortOrder: 'desc'
    });
  };
  
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim() || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  // Apply client-side filtering for legacy support
  const filteredLogs = logs;

  const getStatusBadge = (status: string) => {
    const className = status === 'success' ? 'status-success' : 'status-failed';
    const text = status === 'success' ? '成功' : '失敗';
    return <span className={`status-badge ${className}`}>{text}</span>;
  };

  const getDeliveryTypeBadge = (type: string) => {
    const text = type === 'scheduled' ? '定期配信' : '即時配信';
    return <span className={`delivery-type-badge ${type}`}>{text}</span>;
  };

  if (selectedLog) {
    return (
      <div className="delivery-history-overlay">
        <div className="delivery-history-modal large">
          <div className="delivery-history-header">
            <h3>配信詳細</h3>
            <div className="header-buttons">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedLog(null)}
              >
                戻る
              </button>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
          </div>

          <div className="delivery-history-body">
            <div className="log-detail">
              <div className="log-detail-header">
                <h4>{selectedLog.categoryName}</h4>
                <div className="badges">
                  {getStatusBadge(selectedLog.status)}
                  {getDeliveryTypeBadge(selectedLog.deliveryType)}
                </div>
              </div>

              <div className="log-detail-info">
                <div className="info-row">
                  <span className="label">配信日時:</span>
                  <span>{formatDate(selectedLog.deliveredAt)}</span>
                </div>
                {selectedLog.generatedAt && (
                  <div className="info-row">
                    <span className="label">生成日時:</span>
                    <span>{formatDate(selectedLog.generatedAt)}</span>
                  </div>
                )}
                {selectedLog.recipientEmail && (
                  <div className="info-row">
                    <span className="label">配信先:</span>
                    <span>{selectedLog.recipientEmail}</span>
                  </div>
                )}
                {selectedLog.geminiQuery && (
                  <div className="info-row">
                    <span className="label">クエリ:</span>
                    <span>{selectedLog.geminiQuery}</span>
                  </div>
                )}
              </div>

              {selectedLog.status === 'success' && selectedLog.fullContent && (
                <div className="log-content">
                  <h5>配信内容:</h5>
                  <div className="content-body">
                    <MarkdownRenderer 
                      content={selectedLog.fullContent} 
                      className="content-markdown"
                    />
                  </div>
                </div>
              )}

              {selectedLog.status === 'failed' && selectedLog.errorMessage && (
                <div className="log-error">
                  <h5>エラー内容:</h5>
                  <p className="error-message">{selectedLog.errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-history-overlay">
      <div className="delivery-history-modal">
        <div className="delivery-history-header">
          <h3>
            {categoryName ? `${categoryName} の配信履歴` : '配信履歴'}
          </h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="delivery-history-body">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>配信履歴を読み込み中...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <h4>エラーが発生しました</h4>
              <p>{error}</p>
              <button className="btn-primary" onClick={loadDeliveryHistory}>
                再試行
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="history-filters">
                <div className="basic-filters">
                  <div className="filter-group">
                    <label>検索:</label>
                    <input
                      type="text"
                      placeholder="コンテンツ、カテゴリ、クエリを検索..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                    />
                  </div>
                  
                  <div className="filter-group">
                    <label>ステータス:</label>
                    <select 
                      value={selectedStatus} 
                      onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'success' | 'failed')}
                    >
                      <option value="all">全て</option>
                      <option value="success">成功のみ</option>
                      <option value="failed">失敗のみ</option>
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label>配信タイプ:</label>
                    <select 
                      value={selectedDeliveryType} 
                      onChange={(e) => setSelectedDeliveryType(e.target.value as 'all' | 'scheduled' | 'instant')}
                    >
                      <option value="all">全て</option>
                      <option value="scheduled">定期配信</option>
                      <option value="instant">即時配信</option>
                    </select>
                  </div>
                  
                  <button 
                    className="filter-toggle-btn"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    高度なフィルター {showAdvancedFilters ? '▲' : '▼'}
                  </button>
                </div>
                
                {showAdvancedFilters && (
                  <div className="advanced-filters">
                    <div className="filter-row">
                      <div className="filter-group">
                        <label>開始日:</label>
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                      </div>
                      
                      <div className="filter-group">
                        <label>終了日:</label>
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                      
                      <div className="filter-group">
                        <label>並び順:</label>
                        <select 
                          value={`${filters.sortBy}-${filters.sortOrder}`}
                          onChange={(e) => {
                            const [sortBy, sortOrder] = e.target.value.split('-');
                            setFilters(prev => ({
                              ...prev,
                              sortBy: sortBy as 'deliveredAt' | 'generatedAt',
                              sortOrder: sortOrder as 'asc' | 'desc'
                            }));
                          }}
                        >
                          <option value="deliveredAt-desc">配信日時（新しい順）</option>
                          <option value="deliveredAt-asc">配信日時（古い順）</option>
                          <option value="generatedAt-desc">生成日時（新しい順）</option>
                          <option value="generatedAt-asc">生成日時（古い順）</option>
                        </select>
                      </div>
                      
                      <div className="filter-group">
                        <label>表示件数:</label>
                        <select 
                          value={filters.limit}
                          onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                        >
                          <option value={25}>25 件</option>
                          <option value={50}>50 件</option>
                          <option value={100}>100 件</option>
                          <option value={200}>200 件</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="filter-actions">
                      <button className="btn-primary" onClick={applyFilters}>
                        フィルター適用
                      </button>
                      <button className="btn-secondary" onClick={clearFilters}>
                        クリア
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="results-count">
                  {filteredLogs.length} 件の結果
                </div>
              </div>

              <div className="history-list">
                {filteredLogs.length === 0 ? (
                  <div className="empty-state">
                    <p>配信履歴がありません</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="history-item">
                      <div className="history-item-header">
                        <div className="category-info">
                          <h5>{highlightSearchTerm(log.categoryName || '不明なカテゴリ', searchText)}</h5>
                          <div className="badges">
                            {getStatusBadge(log.status)}
                            {getDeliveryTypeBadge(log.deliveryType)}
                          </div>
                        </div>
                        <div className="delivery-date">
                          {formatDate(log.deliveredAt)}
                        </div>
                      </div>

                      {log.contentSummary && (
                        <div className="history-item-summary">
                          <p>{highlightSearchTerm(log.contentSummary, searchText)}</p>
                        </div>
                      )}
                      
                      {log.geminiQuery && (
                        <div className="history-item-query">
                          <small>
                            <strong>クエリ:</strong> {' '}
                            {highlightSearchTerm(log.geminiQuery.length > 100 ? log.geminiQuery.substring(0, 100) + '...' : log.geminiQuery, searchText)}
                          </small>
                        </div>
                      )}

                      {log.errorMessage && (
                        <div className="history-item-error">
                          <p className="error-text">エラー: {log.errorMessage}</p>
                        </div>
                      )}

                      <div className="history-item-actions">
                        {log.id && (
                          <button 
                            className="btn-secondary small"
                            onClick={() => openLogDetail(log.id!)}
                          >
                            詳細を見る
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="delivery-history-footer">
          <button className="btn-secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryHistory;