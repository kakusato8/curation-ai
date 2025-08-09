import React from 'react'
import type { ContentArchiveFilters } from '../../utils/api'

interface ContentArchiveFiltersProps {
  showFilters: boolean
  onToggleFilters: () => void
  filters: ContentArchiveFilters
  searchText: string
  selectedCategory: string
  dateRange: { start: string; end: string }
  categories: string[]
  onSearchTextChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onDateRangeChange: (field: 'start' | 'end', value: string) => void
  onFiltersChange: (filters: Partial<ContentArchiveFilters>) => void
  onApplyFilters: () => void
  onClearFilters: () => void
}

export const ContentArchiveFilters: React.FC<ContentArchiveFiltersProps> = ({
  showFilters,
  onToggleFilters,
  filters,
  searchText,
  selectedCategory,
  dateRange,
  categories,
  onSearchTextChange,
  onCategoryChange,
  onDateRangeChange,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-')
    onFiltersChange({
      sortBy: sortBy as 'deliveredAt' | 'generatedAt' | 'categoryName',
      sortOrder: sortOrder as 'asc' | 'desc'
    })
  }

  return (
    <>
      <div className="header-actions">
        <button 
          className="filter-toggle-btn"
          onClick={onToggleFilters}
        >
          フィルター {showFilters ? '▲' : '▼'}
        </button>
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
                onChange={(e) => onSearchTextChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onApplyFilters()}
              />
            </div>
            
            <div className="filter-group">
              <label>カテゴリ:</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <option value="">全てのカテゴリ</option>
                {categories.map((category) => (
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
                onChange={(e) => onDateRangeChange('start', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>終了日:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRangeChange('end', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>並び順:</label>
              <select 
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
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
            <button className="btn-primary" onClick={onApplyFilters}>
              フィルター適用
            </button>
            <button className="btn-secondary" onClick={onClearFilters}>
              クリア
            </button>
          </div>
        </div>
      )}
    </>
  )
}