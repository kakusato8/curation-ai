import React, { useState, useEffect, useMemo } from 'react';
import { 
  apiClient, 
  DeliveryLog, 
  ContentArchiveResponse, 
  ContentArchiveFilters 
} from '../utils/api';
import { formatDate, getDateGroupLabel, getDateKey, formatDateKey } from '../utils/dateUtils';
import MarkdownRenderer from './MarkdownRenderer';

interface ContentArchiveProps {
  onClose?: () => void;
}

const ContentArchive: React.FC<ContentArchiveProps> = ({ onClose }) => {
  const [archiveData, setArchiveData] = useState<ContentArchiveResponse | null>(null);
  const [selectedContent, setSelectedContent] = useState<DeliveryLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'batch'; logId?: string; logIds?: string[] } | null>(null);
  
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
  const [groupByDate, setGroupByDate] = useState(true);
  const [consolidatedView, setConsolidatedView] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContentArchive();
  }, []);

  const loadContentArchive = async (forceRefresh: boolean = false) => {
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

      const response = await apiClient.getContentArchive(filterOptions, forceRefresh);
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
    // When applying filters with search text, expand all groups to show results
    if (searchText.trim()) {
      setCollapsedGroups(new Set());
    }
    // Clear selection when applying filters
    setSelectedItems(new Set());
    setSelectionMode(false);
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
    // Clear selection when clearing filters
    setSelectedItems(new Set());
    setSelectionMode(false);
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

  const groupedContent = useMemo(() => {
    if (!groupByDate) {
      return [{ group: 'all', label: 'すべてのコンテンツ', items: filteredContent }];
    }
    
    const groups: { [key: string]: DeliveryLog[] } = {};
    
    filteredContent.forEach((item) => {
      const groupLabel = getDateGroupLabel(item.deliveredAt);
      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(item);
    });
    
    // Sort groups by chronological order
    const sortedGroups = Object.entries(groups).sort(([labelA], [labelB]) => {
      const orderMap: { [key: string]: number } = {
        '今日': 1,
        '昨日': 2,
        '今週': 3,
        '今月': 4
      };
      
      const orderA = orderMap[labelA] || 999;
      const orderB = orderMap[labelB] || 999;
      
      if (orderA !== 999 && orderB !== 999) {
        return orderA - orderB;
      }
      
      if (orderA !== 999) return -1;
      if (orderB !== 999) return 1;
      
      // For year-month groups, sort descending
      return labelB.localeCompare(labelA);
    });
    
    return sortedGroups.map(([label, items]) => ({
      group: label,
      label,
      items: items.sort((a, b) => {
        const dateA = new Date(a.deliveredAt).getTime();
        const dateB = new Date(b.deliveredAt).getTime();
        return dateB - dateA; // Most recent first within each group
      })
    }));
  }, [filteredContent, groupByDate]);

  // Group content by exact dates for consolidated view
  const consolidatedContent = useMemo(() => {
    const groups: { [key: string]: DeliveryLog[] } = {};
    
    filteredContent.forEach((item) => {
      const dateKey = getDateKey(item.deliveredAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    
    // Sort by date (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    
    return sortedDates.map(dateKey => ({
      dateKey,
      displayDate: formatDateKey(dateKey),
      items: groups[dateKey].sort((a, b) => {
        const dateA = new Date(a.deliveredAt).getTime();
        const dateB = new Date(b.deliveredAt).getTime();
        return dateA - dateB; // Chronological order within each day
      })
    }));
  }, [filteredContent]);

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupLabel)) {
        newSet.delete(groupLabel);
      } else {
        newSet.add(groupLabel);
      }
      return newSet;
    });
  };

  const toggleAllGroups = () => {
    if (collapsedGroups.size === 0) {
      // Collapse all groups
      const allGroupLabels = groupedContent.map(group => group.label);
      setCollapsedGroups(new Set(allGroupLabels));
    } else {
      // Expand all groups
      setCollapsedGroups(new Set());
    }
  };

  // Delete functions
  const handleDeleteSingle = (logId: string) => {
    setDeleteTarget({ type: 'single', logId });
    setShowDeleteConfirm(true);
  };

  const handleDeleteBatch = () => {
    const logIds = Array.from(selectedItems);
    console.log('=== HANDLE DELETE BATCH ===');
    console.log('Selected items set:', selectedItems);
    console.log('LogIds array:', logIds);
    console.log('LogIds count:', logIds.length);
    
    if (logIds.length === 0) {
      console.log('No items selected, returning early');
      return;
    }
    
    setDeleteTarget({ type: 'batch', logIds });
    setShowDeleteConfirm(true);
    console.log('Delete confirmation dialog shown');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    console.log('=== DELETE OPERATION START ===');
    console.log('Delete target:', deleteTarget);
    console.log('Current archive data logs count:', archiveData?.logs.length);

    try {
      setDeleteLoading(true);
      
      let deletedIds: string[] = [];
      
      if (deleteTarget.type === 'single' && deleteTarget.logId) {
        console.log('Performing single delete for logId:', deleteTarget.logId);
        await apiClient.deleteDeliveryLog(deleteTarget.logId);
        deletedIds = [deleteTarget.logId];
        console.log('Single delete successful, deletedIds:', deletedIds);
      } else if (deleteTarget.type === 'batch' && deleteTarget.logIds) {
        console.log('Performing batch delete for logIds:', deleteTarget.logIds);
        const result = await apiClient.batchDeleteDeliveryLogs(deleteTarget.logIds);
        console.log('Batch delete API response:', result);
        
        // Use only the actually deleted IDs from the backend response
        deletedIds = result.deletedIds || [];
        console.log('Extracted deletedIds from response:', deletedIds);
        
        if (result.failed > 0) {
          console.warn(`${result.failed} deletions failed:`, result.errors);
          
          // Show user-friendly error message if some deletions failed
          if (deletedIds.length > 0) {
            setError(`${deletedIds.length}件が削除されましたが、${result.failed}件の削除に失敗しました。`);
          } else {
            setError('すべての削除に失敗しました。もう一度お試しください。');
          }
        }
      }

      console.log('Final deletedIds array:', deletedIds);
      console.log('deletedIds length:', deletedIds.length);

      // Skip optimistic update - rely only on server refresh to avoid state conflicts
      console.log('Starting loadContentArchive(true) for data refresh...');
      await loadContentArchive(true);
      console.log('Data refresh completed');
      
      // Clear selections and exit selection mode
      setSelectedItems(new Set());
      setSelectionMode(false);
      
      console.log('=== DELETE OPERATION SUCCESS ===');
      
    } catch (err) {
      console.error('Delete failed:', err);
      setError('削除に失敗しました。もう一度お試しください。');
      // If delete failed, reload to get correct state
      await loadContentArchive(true);
      console.log('=== DELETE OPERATION FAILED ===');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // Selection functions
  const toggleItemSelection = (logId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    const allIds = filteredContent.map(item => item.id).filter(id => id) as string[];
    setSelectedItems(new Set(allIds));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedItems(new Set());
    }
  };

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
              {onClose && <button className="close-button" onClick={onClose}>×</button>}
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
                  <MarkdownRenderer 
                    content={selectedContent.fullContent || ''} 
                    className="content-markdown"
                  />
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
              <button 
                className={`view-btn ${groupByDate ? 'active' : ''}`}
                onClick={() => setGroupByDate(!groupByDate)}
                title="日付グループ表示"
              >
                📅
              </button>
              <button 
                className={`view-btn ${consolidatedView ? 'active' : ''}`}
                onClick={() => setConsolidatedView(!consolidatedView)}
                title="日次統合表示"
              >
                📖
              </button>
            </div>
            <button 
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              フィルター {showFilters ? '▲' : '▼'}
            </button>
            {onClose && <button className="close-button" onClick={onClose}>×</button>}
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
                {groupByDate && (
                  <span className="groups-count">
                    {groupedContent.length} グループ
                  </span>
                )}
              </div>

              {/* Selection Mode Controls */}
            {!consolidatedView && filteredContent.length > 0 && (
              <div className="selection-controls">
                <div className="selection-actions">
                  <button 
                    className={`btn-secondary ${selectionMode ? 'active' : ''}`}
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? '選択モード終了' : '選択モード'}
                  </button>
                  
                  {selectionMode && (
                    <>
                      <button 
                        className="btn-secondary small"
                        onClick={selectAllItems}
                        disabled={selectedItems.size === filteredContent.length}
                      >
                        すべて選択
                      </button>
                      <button 
                        className="btn-secondary small"
                        onClick={deselectAllItems}
                        disabled={selectedItems.size === 0}
                      >
                        選択解除
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={handleDeleteBatch}
                        disabled={selectedItems.size === 0}
                      >
                        選択した{selectedItems.size}件を削除
                      </button>
                    </>
                  )}
                </div>
                {selectionMode && (
                  <div className="selection-status">
                    {selectedItems.size} / {filteredContent.length} 件選択中
                  </div>
                )}
              </div>
            )}

            {filteredContent.length === 0 ? (
                <div className="empty-state">
                  <h4>コンテンツが見つかりません</h4>
                  <p>フィルター条件を変更してみてください</p>
                </div>
              ) : consolidatedView ? (
                <div className="consolidated-content">
                  {consolidatedContent.map((dateGroup) => (
                    <div key={dateGroup.dateKey} className="daily-consolidated-section">
                      <div className="daily-consolidated-header">
                        <h3 className="daily-date-title">
                          {dateGroup.displayDate}
                          <span className="daily-count">({dateGroup.items.length}件)</span>
                        </h3>
                        <div className="daily-actions">
                          <button 
                            className="btn-secondary small"
                            onClick={() => {
                              const allContent = dateGroup.items.map(item => 
                                `【${item.categoryName}】 (${formatDate(item.deliveredAt)})\n${item.fullContent || ''}`
                              ).join('\n\n---\n\n');
                              navigator.clipboard.writeText(allContent);
                            }}
                            title="この日のすべてのコンテンツをコピー"
                          >
                            すべてコピー
                          </button>
                        </div>
                      </div>
                      
                      <div className="daily-consolidated-content">
                        {dateGroup.items.map((content, index) => (
                          <div key={content.id} className="consolidated-item">
                            <div className="consolidated-item-header">
                              <div className="content-metadata">
                                <span className="category-tag">{content.categoryName}</span>
                                <span className="time-tag">{formatDate(content.deliveredAt)}</span>
                              </div>
                              <div className="item-actions">
                                {content.geminiQuery && (
                                  <button 
                                    className="show-query-btn"
                                    title="生成クエリを表示"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const button = e.target as HTMLElement;
                                      const queryDiv = button.closest('.consolidated-item')?.querySelector('.item-query') as HTMLElement;
                                      if (queryDiv) {
                                        queryDiv.style.display = queryDiv.style.display === 'none' ? 'block' : 'none';
                                      }
                                    }}
                                  >
                                    Q
                                  </button>
                                )}
                                <button 
                                  className="copy-item-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText(content.fullContent || '');
                                  }}
                                  title="このコンテンツをコピー"
                                >
                                  コピー
                                </button>
                                <button 
                                  className="expand-item-btn"
                                  onClick={() => setSelectedContent(content)}
                                  title="詳細表示"
                                >
                                  詳細
                                </button>
                                <button 
                                  className="delete-item-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    content.id && handleDeleteSingle(content.id);
                                  }}
                                  title="このコンテンツを削除"
                                >
                                  削除
                                </button>
                              </div>
                            </div>
                            
                            {content.geminiQuery && (
                              <div className="item-query" style={{ display: 'none' }}>
                                <small><strong>生成クエリ:</strong> {content.geminiQuery}</small>
                              </div>
                            )}
                            
                            <div className="consolidated-item-content">
                              <div className="content-text-flow">
                                <MarkdownRenderer 
                                  content={content.fullContent || ''} 
                                  searchTerm={searchText}
                                  className="content-markdown"
                                />
                              </div>
                            </div>
                            
                            {index < dateGroup.items.length - 1 && (
                              <div className="content-separator"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : groupByDate ? (
                <>
                  <div className="group-controls">
                    <button 
                      className="btn-secondary small"
                      onClick={toggleAllGroups}
                    >
                      {collapsedGroups.size === 0 ? 'すべて折りたたむ' : 'すべて展開'}
                    </button>
                  </div>
                  <div className="archive-content-grouped">
                    {groupedContent.map((group) => (
                    <div key={group.group} className="date-group">
                      <div 
                        className="date-group-header"
                        onClick={() => toggleGroup(group.label)}
                      >
                        <h4 className="date-group-title">
                          {group.label}
                          <span className="group-count">({group.items.length})</span>
                        </h4>
                        <button className="group-toggle-btn">
                          {collapsedGroups.has(group.label) ? '▶' : '▼'}
                        </button>
                      </div>
                      
                      {!collapsedGroups.has(group.label) && (
                        <div className={`archive-content ${viewMode}`}>
                          {group.items.map((content) => (
                            <div 
                              key={content.id} 
                              className={`archive-item ${selectionMode ? 'selectable' : ''} ${selectedItems.has(content.id || '') ? 'selected' : ''}`}
                              onClick={() => {
                                if (selectionMode && content.id) {
                                  toggleItemSelection(content.id);
                                } else {
                                  setSelectedContent(content);
                                }
                              }}
                            >
                              {selectionMode && content.id && (
                                <div className="selection-checkbox">
                                  <input 
                                    type="checkbox" 
                                    checked={content.id ? selectedItems.has(content.id) : false} 
                                    onChange={() => content.id && toggleItemSelection(content.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              )}
                              <div className="archive-item-header">
                                <h5 className="category-name">
                                  {highlightSearchTerm(content.categoryName || '不明なカテゴリ', searchText)}
                                </h5>
                                <span className="delivery-date">
                                  {formatDate(content.deliveredAt)}
                                </span>
                              </div>
                              
                              <div className="archive-item-content">
                                <div className="content-preview">
                                  <MarkdownRenderer 
                                    content={truncateContent(content.fullContent || '')}
                                    searchTerm={searchText}
                                    className="content-markdown preview"
                                  />
                                </div>
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
                                {!selectionMode && (
                                  <>
                                    <button 
                                      className="view-btn small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedContent(content);
                                      }}
                                    >
                                      詳細を見る →
                                    </button>
                                    <button 
                                      className="delete-btn small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        content.id && handleDeleteSingle(content.id);
                                      }}
                                      title="削除"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                </>
              ) : (
                <div className={`archive-content ${viewMode}`}>
                  {filteredContent.map((content) => (
                    <div 
                      key={content.id} 
                      className={`archive-item ${selectionMode ? 'selectable' : ''} ${selectedItems.has(content.id || '') ? 'selected' : ''}`}
                      onClick={() => {
                        if (selectionMode && content.id) {
                          toggleItemSelection(content.id);
                        } else {
                          setSelectedContent(content);
                        }
                      }}
                    >
                      {selectionMode && content.id && (
                        <div className="selection-checkbox">
                          <input 
                            type="checkbox" 
                            checked={content.id ? selectedItems.has(content.id) : false} 
                            onChange={() => content.id && toggleItemSelection(content.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      <div className="archive-item-header">
                        <h5 className="category-name">
                          {highlightSearchTerm(content.categoryName || '不明なカテゴリ', searchText)}
                        </h5>
                        <span className="delivery-date">
                          {formatDate(content.deliveredAt)}
                        </span>
                      </div>
                      
                      <div className="archive-item-content">
                        <div className="content-preview">
                          <MarkdownRenderer 
                            content={truncateContent(content.fullContent || '')}
                            searchTerm={searchText}
                            className="content-markdown preview"
                          />
                        </div>
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
                        {!selectionMode && (
                          <>
                            <button 
                              className="view-btn small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContent(content);
                              }}
                            >
                              詳細を見る →
                            </button>
                            <button 
                              className="delete-btn small"
                              onClick={(e) => {
                                e.stopPropagation();
                                content.id && handleDeleteSingle(content.id);
                              }}
                              title="削除"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {onClose && (
          <div className="content-archive-footer">
            <button className="btn-secondary" onClick={onClose}>
              閉じる
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="delete-confirmation-overlay">
            <div className="delete-confirmation-modal">
              <h4>削除の確認</h4>
              <p>
                {deleteTarget?.type === 'single' 
                  ? 'このコンテンツを削除しますか？'
                  : `選択された${deleteTarget?.logIds?.length || 0}件のコンテンツを削除しますか？`
                }
              </p>
              <p className="delete-warning">
                この操作は取り消せません。
              </p>
              <div className="delete-confirmation-actions">
                <button 
                  className="btn-secondary"
                  onClick={cancelDelete}
                  disabled={deleteLoading}
                >
                  キャンセル
                </button>
                <button 
                  className="btn-danger"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentArchive;