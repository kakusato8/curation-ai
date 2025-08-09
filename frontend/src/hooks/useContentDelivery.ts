import { useState, useCallback } from 'react'
import { apiClient, DeliveryContentResponse, BatchDeliveryResponse } from '../utils/api'

export type ContentDeliveryResult = DeliveryContentResponse | BatchDeliveryResponse | null

export interface UseContentDeliveryOptions {
  onSuccess?: (result: ContentDeliveryResult) => void
  onError?: (error: string) => void
}

export interface UseContentDeliveryReturn {
  content: ContentDeliveryResult
  loading: boolean
  error: string | null
  visible: boolean
  
  // Actions
  deliverContent: (settingId: string) => Promise<void>
  deliverAllContent: () => Promise<void>
  clearContent: () => void
  showContent: (content: ContentDeliveryResult) => void
  hideContent: () => void
  
  // Utilities
  isSuccess: boolean
  hasError: boolean
  isSingleDelivery: boolean
  isBatchDelivery: boolean
}

export const useContentDelivery = (options: UseContentDeliveryOptions = {}): UseContentDeliveryReturn => {
  const { onSuccess, onError } = options
  
  const [content, setContent] = useState<ContentDeliveryResult>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage
    setError(errorMessage)
    if (onError) {
      onError(errorMessage)
    }
    console.error('Content delivery error:', error)
  }, [onError])

  const handleSuccess = useCallback((result: ContentDeliveryResult) => {
    setContent(result)
    setError(null)
    setVisible(true)
    if (onSuccess) {
      onSuccess(result)
    }
  }, [onSuccess])

  const deliverContent = useCallback(async (settingId: string) => {
    try {
      setLoading(true)
      setError(null)
      setVisible(true)
      
      const result = await apiClient.instantContentDelivery(settingId)
      handleSuccess(result)
    } catch (error) {
      handleError(error, 'コンテンツの生成に失敗しました')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [handleError, handleSuccess])

  const deliverAllContent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setVisible(true)
      
      const result = await apiClient.instantContentDeliveryAll()
      handleSuccess(result)
    } catch (error) {
      handleError(error, 'コンテンツの生成に失敗しました')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [handleError, handleSuccess])

  const clearContent = useCallback(() => {
    setContent(null)
    setError(null)
    setVisible(false)
  }, [])

  const showContent = useCallback((content: ContentDeliveryResult) => {
    setContent(content)
    setError(null)
    setVisible(true)
  }, [])

  const hideContent = useCallback(() => {
    setVisible(false)
  }, [])

  // Computed values
  const isSuccess = Boolean(content && !error)
  const hasError = Boolean(error)
  const isSingleDelivery = Boolean(content && 'settingId' in content)
  const isBatchDelivery = Boolean(content && 'contents' in content)

  return {
    content,
    loading,
    error,
    visible,
    deliverContent,
    deliverAllContent,
    clearContent,
    showContent,
    hideContent,
    isSuccess,
    hasError,
    isSingleDelivery,
    isBatchDelivery,
  }
}