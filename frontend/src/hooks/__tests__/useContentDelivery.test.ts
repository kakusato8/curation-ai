import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useContentDelivery } from '../useContentDelivery'
import { apiClient } from '../../utils/api'

vi.mock('../../utils/api')

describe('useContentDelivery', () => {
  const mockSingleDeliveryResponse = {
    settingId: 'setting-1',
    categoryName: 'Test Category',
    content: 'Generated content',
    query: 'Test query',
    generatedAt: new Date().toISOString(),
    success: true,
  }

  const mockBatchDeliveryResponse = {
    contents: [mockSingleDeliveryResponse],
    totalProcessed: 1,
    successful: 1,
    failed: 0,
    errors: [],
    generatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useContentDelivery())

    expect(result.current.content).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.visible).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.hasError).toBe(false)
    expect(result.current.isSingleDelivery).toBe(false)
    expect(result.current.isBatchDelivery).toBe(false)
  })

  it('should deliver content for single setting', async () => {
    vi.mocked(apiClient.instantContentDelivery).mockResolvedValue(mockSingleDeliveryResponse)

    const { result } = renderHook(() => useContentDelivery())

    await act(async () => {
      await result.current.deliverContent('setting-1')
    })

    expect(apiClient.instantContentDelivery).toHaveBeenCalledWith('setting-1')
    expect(result.current.content).toEqual(mockSingleDeliveryResponse)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.visible).toBe(true)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isSingleDelivery).toBe(true)
    expect(result.current.isBatchDelivery).toBe(false)
  })

  it('should deliver content for all settings', async () => {
    vi.mocked(apiClient.instantContentDeliveryAll).mockResolvedValue(mockBatchDeliveryResponse)

    const { result } = renderHook(() => useContentDelivery())

    await act(async () => {
      await result.current.deliverAllContent()
    })

    expect(apiClient.instantContentDeliveryAll).toHaveBeenCalled()
    expect(result.current.content).toEqual(mockBatchDeliveryResponse)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.visible).toBe(true)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isSingleDelivery).toBe(false)
    expect(result.current.isBatchDelivery).toBe(true)
  })

  it('should handle single content delivery error', async () => {
    const mockError = new Error('Delivery failed')
    vi.mocked(apiClient.instantContentDelivery).mockRejectedValue(mockError)

    const { result } = renderHook(() => useContentDelivery())

    await act(async () => {
      await result.current.deliverContent('setting-1')
    })

    expect(result.current.content).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Delivery failed')
    expect(result.current.visible).toBe(true) // Still visible to show error
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.hasError).toBe(true)
  })

  it('should handle batch content delivery error', async () => {
    const mockError = new Error('Batch delivery failed')
    vi.mocked(apiClient.instantContentDeliveryAll).mockRejectedValue(mockError)

    const { result } = renderHook(() => useContentDelivery())

    await act(async () => {
      await result.current.deliverAllContent()
    })

    expect(result.current.content).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Batch delivery failed')
    expect(result.current.visible).toBe(true)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.hasError).toBe(true)
  })

  it('should clear content', () => {
    const { result } = renderHook(() => useContentDelivery())

    // Set some content first
    act(() => {
      result.current.showContent(mockSingleDeliveryResponse)
    })

    expect(result.current.content).toEqual(mockSingleDeliveryResponse)
    expect(result.current.visible).toBe(true)

    // Clear content
    act(() => {
      result.current.clearContent()
    })

    expect(result.current.content).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.visible).toBe(false)
  })

  it('should show and hide content manually', () => {
    const { result } = renderHook(() => useContentDelivery())

    // Show content
    act(() => {
      result.current.showContent(mockSingleDeliveryResponse)
    })

    expect(result.current.content).toEqual(mockSingleDeliveryResponse)
    expect(result.current.visible).toBe(true)
    expect(result.current.error).toBeNull()

    // Hide content
    act(() => {
      result.current.hideContent()
    })

    expect(result.current.content).toEqual(mockSingleDeliveryResponse) // Content remains
    expect(result.current.visible).toBe(false)
  })

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn()
    vi.mocked(apiClient.instantContentDelivery).mockResolvedValue(mockSingleDeliveryResponse)

    const { result } = renderHook(() => useContentDelivery({ onSuccess }))

    await act(async () => {
      await result.current.deliverContent('setting-1')
    })

    expect(onSuccess).toHaveBeenCalledWith(mockSingleDeliveryResponse)
  })

  it('should call onError callback', async () => {
    const onError = vi.fn()
    const mockError = new Error('Test error')
    vi.mocked(apiClient.instantContentDelivery).mockRejectedValue(mockError)

    const { result } = renderHook(() => useContentDelivery({ onError }))

    await act(async () => {
      await result.current.deliverContent('setting-1')
    })

    expect(onError).toHaveBeenCalledWith('Test error')
  })

  it('should show loading state during delivery', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    
    vi.mocked(apiClient.instantContentDelivery).mockReturnValue(promise)

    const { result } = renderHook(() => useContentDelivery())

    // Start delivery
    act(() => {
      result.current.deliverContent('setting-1')
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.visible).toBe(true)

    // Resolve promise
    await act(async () => {
      resolvePromise(mockSingleDeliveryResponse)
      await promise
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.content).toEqual(mockSingleDeliveryResponse)
  })
})