import React, { useState, useEffect, useMemo } from 'react';
import { 
  apiClient, 
  DeliveryLog, 
  ContentArchiveResponse, 
  ContentArchiveFilters 
} from '../utils/api';

interface ContentArchiveProps {
  onClose: () => void;
}

const ContentArchive: React.FC<ContentArchiveProps> = ({ onClose }) => {
  const [archiveData, setArchiveData] = useState<ContentArchiveResponse | null>(null);
  const [selectedContent, setSelectedContent] = useState<DeliveryLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<ContentArchiveFilters>({
    limit: 100,
    sortBy: 'deliveredAt',
    sortOrder: 'desc'
  });
  
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadContentArchive();
  }, []);

  const loadContentArchive = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filterOptions: ContentArchiveFilters = {
        ...filters,
        searchText: searchText.trim() || undefined,
        categoryName: selectedCategory || undefined,
        startDate: dateRange.start ? new Date(dateRange.start) : undefined,
        endDate: dateRange.end ? new Date(dateRange.end) : undefined,
      };

      const response = await apiClient.getContentArchive(filterOptions);
      setArchiveData(response);
    } catch (err) {
      setError('コンテンツアーカイブの読み込みに失敗しました');
      console.error('Failed to load content archive:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    loadContentArchive();
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setDateRange({ start: '', end: '' });
    setFilters({
      limit: 100,
      sortBy: 'deliveredAt',
      sortOrder: 'desc'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
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

  const filteredContent = useMemo(() => {
    if (!archiveData) return [];
    
    let content = [...archiveData.logs];
    
    // Client-side sorting options
    if (filters.sortBy === 'categoryName') {
      content.sort((a, b) => {
        const aVal = a.categoryName || '';
        const bVal = b.categoryName || '';
        const result = aVal.localeCompare(bVal);
        return filters.sortOrder === 'desc' ? -result : result;
      });
    }
    
    return content;
  }, [archiveData, filters]);

  // Content detail view
  if (selectedContent) {
    return (
      <div className="content-archive-overlay">
        <div className="content-archive-modal large">
          <div className="content-archive-header">
            <h3>コンテンツ詳細</h3>
            <div className="header-buttons">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedContent(null)}
              >
                戻る
              </button>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
          </div>

          <div className="content-archive-body">
            <div className="content-detail">
              <div className="content-detail-header">
                <h4>{selectedContent.categoryName}</h4>
                <div className="content-meta">
                  <span className="delivery-date">
                    配信日時: {formatDate(selectedContent.deliveredAt)}
                  </span>
                  {selectedContent.generatedAt && (
                    <span className="generated-date">
                      生成日時: {formatDate(selectedContent.generatedAt)}
                    </span>
                  )}
                </div>
              </div>

              {selectedContent.geminiQuery && (
                <div className="content-query">
                  <h5>生成クエリ:</h5>
                  <p className="query-text">{selectedContent.geminiQuery}</p>
                </div>
              )}

              <div className="content-body-full">
                <h5>コンテンツ全文:</h5>
                <div className="content-text">
                  <pre>{selectedContent.fullContent}</pre>
                </div>
              </div>

              <div className="content-actions">
                <button 
                  className="btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedContent.fullContent || '');
                    // You could add a toast notification here
                  }}
                >
                  コピー
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-archive-overlay">
      <div className="content-archive-modal">
        <div className="content-archive-header">
          <h3>コンテンツライブラリ</h3>
          <div className="header-actions">
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="グリッド表示"
              >
                ⊞
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="リスト表示"
              >
                ☰
              </button>
            </div>
            <button 
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              フィルター {showFilters ? '▲' : '▼'}
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        {showFilters && (
          <div className="archive-filters">
            <div className="filters-row">
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
                <label>カテゴリ:</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">全てのカテゴリ</option>
                  {archiveData?.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filters-row">
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
                      sortBy: sortBy as 'deliveredAt' | 'generatedAt' | 'categoryName',
                      sortOrder: sortOrder as 'asc' | 'desc'
                    }));
                  }}
                >
                  <option value="deliveredAt-desc">配信日時（新しい順）</option>
                  <option value="deliveredAt-asc">配信日時（古い順）</option>
                  <option value="generatedAt-desc">生成日時（新しい順）</option>
                  <option value="generatedAt-asc">生成日時（古い順）</option>
                  <option value="categoryName-asc">カテゴリ（A-Z）</option>
                  <option value="categoryName-desc">カテゴリ（Z-A）</option>
                </select>
              </div>
            </div>

            <div className="filters-actions">
              <button className="btn-primary" onClick={applyFilters}>
                フィルター適用
              </button>
              <button className="btn-secondary" onClick={clearFilters}>
                クリア
              </button>
            </div>
          </div>
        )}

        <div className="content-archive-body">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>コンテンツを読み込み中...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <h4>エラーが発生しました</h4>
              <p>{error}</p>
              <button className="btn-primary" onClick={loadContentArchive}>
                再試行
              </button>
            </div>
          )}

          {!loading && !error && archiveData && (
            <>
              <div className="archive-stats">
                <span className="total-count">
                  {filteredContent.length} 件のコンテンツ
                </span>
                <span className="categories-count">
                  {archiveData.categories.length} カテゴリ
                </span>
              </div>

              <div className={`archive-content ${viewMode}`}>
                {filteredContent.length === 0 ? (
                  <div className="empty-state">
                    <h4>コンテンツが見つかりません</h4>
                    <p>フィルター条件を変更してみてください</p>
                  </div>
                ) : (
                  filteredContent.map((content) => (
                    <div 
                      key={content.id} 
                      className="archive-item"
                      onClick={() => setSelectedContent(content)}
                    >
                      <div className="archive-item-header">
                        <h5 className="category-name">
                          {highlightSearchTerm(content.categoryName || '不明なカテゴリ', searchText)}
                        </h5>
                        <span className="delivery-date">
                          {formatDate(content.deliveredAt)}
                        </span>
                      </div>
                      
                      <div className="archive-item-content">
                        <p>
                          {highlightSearchTerm(
                            truncateContent(content.fullContent || ''),
                            searchText
                          )}
                        </p>
                      </div>
                      
                      {content.geminiQuery && (
                        <div className="archive-item-query">
                          <small>
                            <strong>クエリ:</strong> {' '}
                            {highlightSearchTerm(
                              truncateContent(content.geminiQuery, 100),
                              searchText
                            )}
                          </small>
                        </div>
                      )}
                      
                      <div className="archive-item-actions">
                        <button className="view-btn small">
                          詳細を見る →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="content-archive-footer">
          <button className="btn-secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentArchive;