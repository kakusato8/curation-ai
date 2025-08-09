import { useState, useEffect, useMemo } from 'react'
import { 
  apiClient, 
  DeliveryLog, 
  ContentArchiveResponse, 
  ContentArchiveFilters 
} from '../../utils/api'
import { getDateGroupLabel, getDateKey, formatDateKey } from '../../utils/dateUtils'

export interface UseContentArchiveOptions {
  onError?: (error: string) => void
}

export interface ContentArchiveState {
  // Data states
  archiveData: ContentArchiveResponse | null
  selectedContent: DeliveryLog | null
  loading: boolean
  error: string | null

  // Filter states
  filters: ContentArchiveFilters
  searchText: string
  selectedCategory: string
  dateRange: { start: string; end: string }

  // View states
  viewMode: 'grid' | 'list'
  showFilters: boolean
  groupByDate: boolean
  consolidatedView: boolean
  collapsedGroups: Set<string>

  // Selection states
  selectedItems: Set<string>
  selectionMode: boolean

  // Delete states
  deleteLoading: boolean
  showDeleteConfirm: boolean
  deleteTarget: { type: 'single' | 'batch'; logId?: string; logIds?: string[] } | null
}

export interface ContentArchiveActions {
  // Data actions
  loadContentArchive: (forceRefresh?: boolean) => Promise<void>
  setSelectedContent: (content: DeliveryLog | null) => void

  // Filter actions
  setSearchText: (value: string) => void
  setSelectedCategory: (value: string) => void
  setDateRange: (range: { start: string; end: string }) => void
  setFilters: (filters: ContentArchiveFilters) => void
  applyFilters: () => void
  clearFilters: () => void

  // View actions
  setViewMode: (mode: 'grid' | 'list') => void
  setShowFilters: (show: boolean) => void
  setGroupByDate: (group: boolean) => void
  setConsolidatedView: (consolidated: boolean) => void
  toggleGroup: (groupLabel: string) => void
  toggleAllGroups: () => void

  // Selection actions
  toggleItemSelection: (logId: string) => void
  selectAllItems: () => void
  deselectAllItems: () => void
  toggleSelectionMode: () => void

  // Delete actions
  handleDeleteSingle: (logId: string) => void
  handleDeleteBatch: () => void
  confirmDelete: () => Promise<void>
  cancelDelete: () => void
}

export const useContentArchive = (options?: UseContentArchiveOptions) => {
  // State definitions
  const [archiveData, setArchiveData] = useState<ContentArchiveResponse | null>(null)
  const [selectedContent, setSelectedContent] = useState<DeliveryLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Delete states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'batch'; logId?: string; logIds?: string[] } | null>(null)

  // Filter states
  const [filters, setFilters] = useState<ContentArchiveFilters>({
    limit: 100,
    sortBy: 'deliveredAt',
    sortOrder: 'desc'
  })
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })

  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [groupByDate, setGroupByDate] = useState(true)
  const [consolidatedView, setConsolidatedView] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Load content archive
  const loadContentArchive = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const filterOptions: ContentArchiveFilters = {
        ...filters,
        searchText: searchText.trim() || undefined,
        categoryName: selectedCategory || undefined,
        startDate: dateRange.start ? new Date(dateRange.start) : undefined,
        endDate: dateRange.end ? new Date(dateRange.end) : undefined,
      }

      const response = await apiClient.getContentArchive(filterOptions, forceRefresh)
      setArchiveData(response)
    } catch (err) {
      const errorMessage = 'コンテンツアーカイブの読み込みに失敗しました'
      setError(errorMessage)
      if (options?.onError) {
        options.onError(errorMessage)
      }
      console.error('Failed to load content archive:', err)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const applyFilters = () => {
    loadContentArchive()
    // When applying filters with search text, expand all groups to show results
    if (searchText.trim()) {
      setCollapsedGroups(new Set())
    }
    // Clear selection when applying filters
    setSelectedItems(new Set())
    setSelectionMode(false)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchText('')
    setSelectedCategory('')
    setDateRange({ start: '', end: '' })
    setFilters({
      limit: 100,
      sortBy: 'deliveredAt',
      sortOrder: 'desc'
    })
    // Clear selection when clearing filters
    setSelectedItems(new Set())
    setSelectionMode(false)
  }

  // Group management
  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupLabel)) {
        newSet.delete(groupLabel)
      } else {
        newSet.add(groupLabel)
      }
      return newSet
    })
  }

  const toggleAllGroups = () => {
    if (!archiveData) return
    
    const groupedContent = getGroupedContent()
    if (collapsedGroups.size === 0) {
      // Collapse all groups
      const allGroupLabels = groupedContent.map(group => group.label)
      setCollapsedGroups(new Set(allGroupLabels))
    } else {
      // Expand all groups
      setCollapsedGroups(new Set())
    }
  }

  // Selection management
  const toggleItemSelection = (logId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const selectAllItems = () => {
    if (!archiveData) return
    const allIds = archiveData.logs.map(item => item.id).filter(id => id) as string[]
    setSelectedItems(new Set(allIds))
  }

  const deselectAllItems = () => {
    setSelectedItems(new Set())
  }

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedItems(new Set())
    }
  }

  // Delete functions
  const handleDeleteSingle = (logId: string) => {
    setDeleteTarget({ type: 'single', logId })
    setShowDeleteConfirm(true)
  }

  const handleDeleteBatch = () => {
    const logIds = Array.from(selectedItems)
    if (logIds.length === 0) return
    
    setDeleteTarget({ type: 'batch', logIds })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      setDeleteLoading(true)
      
      if (deleteTarget.type === 'single' && deleteTarget.logId) {
        await apiClient.deleteDeliveryLog(deleteTarget.logId)
      } else if (deleteTarget.type === 'batch' && deleteTarget.logIds) {
        await apiClient.batchDeleteDeliveryLogs(deleteTarget.logIds)
      }

      // Refresh data
      await loadContentArchive(true)
      
      // Clear selections and exit selection mode
      setSelectedItems(new Set())
      setSelectionMode(false)
      
    } catch (err) {
      console.error('Delete failed:', err)
      setError('削除に失敗しました。もう一度お試しください。')
      // If delete failed, reload to get correct state
      await loadContentArchive(true)
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // Computed values
  const filteredContent = useMemo(() => {
    if (!archiveData) return []
    
    let content = [...archiveData.logs]
    
    // Client-side sorting options
    if (filters.sortBy === 'categoryName') {
      content.sort((a, b) => {
        const aVal = a.categoryName || ''
        const bVal = b.categoryName || ''
        const result = aVal.localeCompare(bVal)
        return filters.sortOrder === 'desc' ? -result : result
      })
    }
    
    return content
  }, [archiveData, filters])

  const getGroupedContent = () => {
    if (!groupByDate) {
      return [{ group: 'all', label: 'すべてのコンテンツ', items: filteredContent }]
    }
    
    const groups: { [key: string]: DeliveryLog[] } = {}
    
    filteredContent.forEach((item) => {
      const groupLabel = getDateGroupLabel(item.deliveredAt)
      if (!groups[groupLabel]) {
        groups[groupLabel] = []
      }
      groups[groupLabel].push(item)
    })
    
    // Sort groups by chronological order
    const sortedGroups = Object.entries(groups).sort(([labelA], [labelB]) => {
      const orderMap: { [key: string]: number } = {
        '今日': 1,
        '昨日': 2,
        '今週': 3,
        '今月': 4
      }
      
      const orderA = orderMap[labelA] || 999
      const orderB = orderMap[labelB] || 999
      
      if (orderA !== 999 && orderB !== 999) {
        return orderA - orderB
      }
      
      if (orderA !== 999) return -1
      if (orderB !== 999) return 1
      
      // For year-month groups, sort descending
      return labelB.localeCompare(labelA)
    })
    
    return sortedGroups.map(([label, items]) => ({
      group: label,
      label,
      items: items.sort((a, b) => {
        const dateA = new Date(a.deliveredAt).getTime()
        const dateB = new Date(b.deliveredAt).getTime()
        return dateB - dateA // Most recent first within each group
      })
    }))
  }

  const groupedContent = useMemo(getGroupedContent, [filteredContent, groupByDate])

  // Group content by exact dates for consolidated view
  const consolidatedContent = useMemo(() => {
    const groups: { [key: string]: DeliveryLog[] } = {}
    
    filteredContent.forEach((item) => {
      const dateKey = getDateKey(item.deliveredAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(item)
    })
    
    // Sort by date (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
    
    return sortedDates.map(dateKey => ({
      dateKey,
      displayDate: formatDateKey(dateKey),
      items: groups[dateKey].sort((a, b) => {
        const dateA = new Date(a.deliveredAt).getTime()
        const dateB = new Date(b.deliveredAt).getTime()
        return dateA - dateB // Chronological order within each day
      })
    }))
  }, [filteredContent])

  // Load initial data
  useEffect(() => {
    loadContentArchive()
  }, [])

  const state: ContentArchiveState = {
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
  }

  const actions: ContentArchiveActions = {
    loadContentArchive,
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
  }

  return {
    ...state,
    ...actions,
    filteredContent,
    groupedContent,
    consolidatedContent,
  }
}