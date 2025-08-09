import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiClient, DeliveryLog, DeliveryLogsFilters } from '../utils/api'

export interface UseDeliveryLogsOptions {
  onError?: (error: string) => void
  autoLoad?: boolean
  initialFilters?: Partial<DeliveryLogsFilters>
}

export interface UseDeliveryLogsReturn {
  logs: DeliveryLog[]
  loading: boolean
  error: string | null
  filters: DeliveryLogsFilters
  
  // Actions
  loadLogs: (customFilters?: Partial<DeliveryLogsFilters>) => Promise<void>
  refreshLogs: () => Promise<void>
  setFilters: (filters: Partial<DeliveryLogsFilters>) => void
  clearFilters: () => void
  deleteLog: (logId: string) => Promise<void>
  batchDeleteLogs: (logIds: string[]) => Promise<void>
  
  // Computed values
  successLogs: DeliveryLog[]
  failedLogs: DeliveryLog[]
  instantLogs: DeliveryLog[]
  scheduledLogs: DeliveryLog[]
  logsCount: number
  successCount: number
  failedCount: number
}

const defaultFilters: DeliveryLogsFilters = {
  limit: 50,
  sortBy: 'deliveredAt',
  sortOrder: 'desc'
}

export const useDeliveryLogs = (options: UseDeliveryLogsOptions = {}): UseDeliveryLogsReturn => {
  const { onError, autoLoad = true, initialFilters = {} } = options
  
  const [logs, setLogs] = useState<DeliveryLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<DeliveryLogsFilters>({
    ...defaultFilters,
    ...initialFilters
  })

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage
    setError(errorMessage)
    if (onError) {
      onError(errorMessage)
    }
    console.error('Delivery logs error:', error)
  }, [onError])

  const loadLogs = useCallback(async (customFilters?: Partial<DeliveryLogsFilters>) => {
    try {
      setLoading(true)
      setError(null)
      
      const filtersToUse = customFilters ? { ...filters, ...customFilters } : filters
      const response = await apiClient.getDeliveryLogs(filtersToUse)
      setLogs(response.logs || [])
    } catch (error) {
      handleError(error, '配信ログの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [filters, handleError])

  const refreshLogs = useCallback(async () => {
    await loadLogs()
  }, [loadLogs])

  const setFilters = useCallback((newFilters: Partial<DeliveryLogsFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
  }, [])

  const deleteLog = useCallback(async (logId: string) => {
    try {
      setError(null)
      await apiClient.deleteDeliveryLog(logId)
      
      // Remove from local state
      setLogs(prev => prev.filter(log => log.id !== logId))
    } catch (error) {
      handleError(error, 'ログの削除に失敗しました')
      throw error
    }
  }, [handleError])

  const batchDeleteLogs = useCallback(async (logIds: string[]) => {
    try {
      setError(null)
      const result = await apiClient.batchDeleteDeliveryLogs(logIds)
      
      // Remove successfully deleted logs from local state
      if (result.deletedIds && result.deletedIds.length > 0) {
        setLogs(prev => prev.filter(log => !result.deletedIds.includes(log.id || '')))
      }
      
      return result
    } catch (error) {
      handleError(error, 'ログの一括削除に失敗しました')
      throw error
    }
  }, [handleError])

  // Computed values
  const successLogs = useMemo(() => logs.filter(log => log.status === 'success'), [logs])
  const failedLogs = useMemo(() => logs.filter(log => log.status === 'failed'), [logs])
  const instantLogs = useMemo(() => logs.filter(log => log.deliveryType === 'instant'), [logs])
  const scheduledLogs = useMemo(() => logs.filter(log => log.deliveryType === 'scheduled'), [logs])

  // Auto-load logs on mount or when filters change
  useEffect(() => {
    if (autoLoad) {
      loadLogs()
    }
  }, [autoLoad, filters, loadLogs])

  return {
    logs,
    loading,
    error,
    filters,
    loadLogs,
    refreshLogs,
    setFilters,
    clearFilters,
    deleteLog,
    batchDeleteLogs,
    successLogs,
    failedLogs,
    instantLogs,
    scheduledLogs,
    logsCount: logs.length,
    successCount: successLogs.length,
    failedCount: failedLogs.length,
  }
}