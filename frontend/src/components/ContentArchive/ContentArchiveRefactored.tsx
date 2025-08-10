import React from 'react'
import { useContentArchive } from './useContentArchive'
import { ContentArchiveFilters } from './ContentArchiveFilters'
import { ContentDetail } from './ContentDetail'
import { ContentDeleteDialog } from './ContentDeleteDialog'
import { formatDate, truncateContent, highlightSearchTerm } from '../../utils/dateUtils'
import MarkdownRenderer from '../MarkdownRenderer'

interface ContentArchiveRefactoredProps {
  onClose?: () => void
}

export const ContentArchiveRefactored: React.FC<ContentArchiveRefactoredProps> = ({ onClose }) => {
  const {
    // State
    archiveData,
    selectedContent,
    loading,
    error,
    filters,
    searchText,
    selectedCategory,
    dateRange,
    viewMode,
    showFilters,
    groupByDate,
    consolidatedView,
    collapsedGroups,
    selectedItems,
    selectionMode,
    deleteLoading,
    showDeleteConfirm,
    deleteTarget,
    
    // Computed
    filteredContent,
    groupedContent,
    consolidatedContent,

    // Actions
    setSelectedContent,
    setSearchText,
    setSelectedCategory,
    setDateRange,
    setFilters,
    applyFilters,
    clearFilters,
    setViewMode,
    setShowFilters,
    setGroupByDate,
    setConsolidatedView,
    toggleGroup,
    toggleAllGroups,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    toggleSelectionMode,
    handleDeleteSingle,
    handleDeleteBatch,
    confirmDelete,
    cancelDelete,
    loadContentArchive,
  } = useContentArchive({
    onError: (error) => console.error('Content archive error:', error)
  })

  // Content detail view
  if (selectedContent) {
    return (
      <ContentDetail
        content={selectedContent}
        onClose={onClose || (() => {})}
        onBack={() => setSelectedContent(null)}
      />
    )
  }

  const renderViewToggle = () => (
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
  )

  const renderSelectionControls = () => {
    if (consolidatedView || filteredContent.length === 0) return null

    return (
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
    )
  }

  const renderContentItem = (content: any) => (
    <div 
      key={content.id} 
      className={`archive-item ${selectionMode ? 'selectable' : ''} ${selectedItems.has(content.id || '') ? 'selected' : ''}`}
      onClick={() => {
        if (selectionMode && content.id) {
          toggleItemSelection(content.id)
        } else {
          setSelectedContent(content)
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
                e.stopPropagation()
                setSelectedContent(content)
              }}
            >
              詳細を見る →
            </button>
            <button 
              className="delete-btn small"
              onClick={(e) => {
                e.stopPropagation()
                content.id && handleDeleteSingle(content.id)
              }}
              title="削除"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </div>
  )

  const renderConsolidatedView = () => (
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
                  ).join('\n\n---\n\n')
                  navigator.clipboard.writeText(allContent)
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
                          e.stopPropagation()
                          const button = e.target as HTMLElement
                          const queryDiv = button.closest('.consolidated-item')?.querySelector('.item-query') as HTMLElement
                          if (queryDiv) {
                            queryDiv.style.display = queryDiv.style.display === 'none' ? 'block' : 'none'
                          }
                        }}
                      >
                        Q
                      </button>
                    )}
                    <button 
                      className="copy-item-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(content.fullContent || '')
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
                        e.stopPropagation()
                        content.id && handleDeleteSingle(content.id)
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
  )

  const renderGroupedContent = () => (
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
                {group.items.map(renderContentItem)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )

  const renderContent = () => {
    if (filteredContent.length === 0) {
      return (
        <div className="empty-state">
          <h4>コンテンツが見つかりません</h4>
          <p>フィルター条件を変更してみてください</p>
        </div>
      )
    }

    if (consolidatedView) {
      return renderConsolidatedView()
    }

    if (groupByDate) {
      return renderGroupedContent()
    }

    return (
      <div className={`archive-content ${viewMode}`}>
        {filteredContent.map(renderContentItem)}
      </div>
    )
  }

  return (
    <div className="content-archive-container">
      <div className="content-archive-header">
        <h3>コンテンツライブラリ</h3>
        <div className="header-actions">
          {renderViewToggle()}
          <ContentArchiveFilters
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            filters={filters}
            searchText={searchText}
            selectedCategory={selectedCategory}
            dateRange={dateRange}
            categories={archiveData?.categories || []}
            onSearchTextChange={setSearchText}
            onCategoryChange={setSelectedCategory}
            onDateRangeChange={(field, value) => setDateRange(prev => ({ ...prev, [field]: value }))}
            onFiltersChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
          />
          {onClose && <button className="close-button" onClick={onClose}>←</button>}
        </div>
      </div>

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
              <button className="btn-primary" onClick={() => loadContentArchive()}>
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

              {renderSelectionControls()}
              {renderContent()}
            </>
          )}
      </div>

      <ContentDeleteDialog
        isVisible={showDeleteConfirm}
        deleteType={deleteTarget?.type || 'single'}
        itemCount={deleteTarget?.logIds?.length || 0}
        isLoading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}