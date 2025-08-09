import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useSettings } from '../useSettings'
import { apiClient } from '../../utils/api'
import { createMockUserSetting } from '../../test/test-utils'

vi.mock('../../utils/api')

describe('useSettings', () => {
  const mockSettings = [
    createMockUserSetting({ id: 'setting-1', categoryName: 'Category 1' }),
    createMockUserSetting({ id: 'setting-2', categoryName: 'Category 2' }),
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(apiClient.getSettings).mockResolvedValue({
      userId: 'user-1',
      settings: mockSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  it('should load settings on mount by default', async () => {
    const { result } = renderHook(() => useSettings())

    expect(result.current.loading).toBe(false) // Initially false since API is mocked
    
    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    expect(apiClient.getSettings).toHaveBeenCalledTimes(1)
  })

  it('should not auto-load when autoLoad is false', async () => {
    const { result } = renderHook(() => useSettings({ autoLoad: false }))

    expect(result.current.settings).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(apiClient.getSettings).not.toHaveBeenCalled()
  })

  it('should handle settings loading error', async () => {
    const mockError = new Error('Failed to load settings')
    vi.mocked(apiClient.getSettings).mockRejectedValue(mockError)

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load settings')
      expect(result.current.settings).toEqual([])
    })
  })

  it('should create a new setting', async () => {
    const newSettingData = {
      categoryName: 'New Category',
      geminiQuery: 'New query',
      frequency: 'daily' as const,
    }
    const createdSetting = createMockUserSetting({ id: 'new-setting', ...newSettingData })

    vi.mocked(apiClient.createSetting).mockResolvedValue(createdSetting)

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })

    await act(async () => {
      await result.current.createSetting(newSettingData)
    })

    expect(apiClient.createSetting).toHaveBeenCalledWith(newSettingData)
    expect(result.current.settings).toHaveLength(3)
    expect(result.current.settings[2]).toEqual(createdSetting)
  })

  it('should update an existing setting', async () => {
    const settingId = 'setting-1'
    const updateData = { categoryName: 'Updated Category' }
    const updatedSetting = createMockUserSetting({ id: settingId, ...updateData })

    vi.mocked(apiClient.updateSetting).mockResolvedValue(updatedSetting)

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })

    await act(async () => {
      await result.current.updateSetting(settingId, updateData)
    })

    expect(apiClient.updateSetting).toHaveBeenCalledWith(settingId, updateData)
    expect(result.current.settings[0]).toEqual(updatedSetting)
  })

  it('should delete a setting', async () => {
    const settingId = 'setting-1'

    vi.mocked(apiClient.deleteSetting).mockResolvedValue()

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settings).toHaveLength(2)
    })

    await act(async () => {
      await result.current.deleteSetting(settingId)
    })

    expect(apiClient.deleteSetting).toHaveBeenCalledWith(settingId)
    expect(result.current.settings).toHaveLength(1)
    expect(result.current.settings.find(s => s.id === settingId)).toBeUndefined()
  })

  it('should find setting by id', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })

    const foundSetting = result.current.findSettingById('setting-1')
    expect(foundSetting).toEqual(mockSettings[0])

    const notFoundSetting = result.current.findSettingById('non-existent')
    expect(notFoundSetting).toBeUndefined()
  })

  it('should provide correct settings count', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settingsCount).toBe(2)
    })
  })

  it('should refresh settings', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })

    vi.mocked(apiClient.getSettings).mockClear()

    await act(async () => {
      await result.current.refreshSettings()
    })

    expect(apiClient.getSettings).toHaveBeenCalledTimes(1)
  })

  it('should handle create setting error', async () => {
    const mockError = new Error('Create failed')
    vi.mocked(apiClient.createSetting).mockRejectedValue(mockError)

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.settings).toEqual(mockSettings)
    })

    await act(async () => {
      await expect(result.current.createSetting({
        categoryName: 'Test',
        geminiQuery: 'Test',
        frequency: 'daily',
      })).rejects.toThrow('Create failed')
    })

    expect(result.current.error).toBe('Create failed')
    expect(result.current.settings).toEqual(mockSettings) // Should not change
  })

  it('should call onError callback when provided', async () => {
    const onError = vi.fn()
    const mockError = new Error('Test error')
    
    vi.mocked(apiClient.getSettings).mockRejectedValue(mockError)

    renderHook(() => useSettings({ onError }))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Test error')
    })
  })
})