import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from '../api'
import type { UserSetting } from '../api'

// Mock fetch
global.fetch = vi.fn()

// Mock Firebase Auth
const mockGetIdToken = vi.fn().mockResolvedValue('mock-token')
const mockAuth = {
  currentUser: {
    getIdToken: mockGetIdToken,
  },
}

vi.mock('../../firebase', () => ({
  auth: mockAuth,
}))

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // デフォルトの成功レスポンス
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
      statusText: 'OK',
    } as any)
  })

  describe('Authentication', () => {
    it('should include Authorization header with Firebase token', async () => {
      // Ensure user is authenticated
      mockAuth.currentUser = { getIdToken: mockGetIdToken }
      
      await apiClient.getSettings()

      expect(mockGetIdToken).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(apiClient.getSettings()).rejects.toThrow('User not authenticated')
    })
  })

  describe('Settings API', () => {
    beforeEach(() => {
      mockAuth.currentUser = { getIdToken: mockGetIdToken }
    })

    it('should get settings', async () => {
      const mockSettings = {
        userId: 'user-1',
        settings: [{ id: 'setting-1', categoryName: 'Test' }],
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSettings),
      } as any)

      const result = await apiClient.getSettings()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/settings',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
      expect(result).toEqual(mockSettings)
    })

    it('should create setting', async () => {
      const newSetting: Omit<UserSetting, 'id'> = {
        categoryName: 'New Category',
        geminiQuery: 'Test query',
        frequency: 'daily',
      }

      const mockCreatedSetting: UserSetting = {
        id: 'new-setting-id',
        ...newSetting,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockCreatedSetting),
      } as any)

      const result = await apiClient.createSetting(newSetting)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/settings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newSetting),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
      expect(result).toEqual(mockCreatedSetting)
    })

    it('should update setting', async () => {
      const settingId = 'setting-1'
      const updateData = { categoryName: 'Updated Category' }
      const mockUpdatedSetting: UserSetting = {
        id: settingId,
        categoryName: 'Updated Category',
        geminiQuery: 'Original query',
        frequency: 'daily',
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockUpdatedSetting),
      } as any)

      const result = await apiClient.updateSetting(settingId, updateData)

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/settings/${settingId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      )
      expect(result).toEqual(mockUpdatedSetting)
    })

    it('should delete setting', async () => {
      const settingId = 'setting-1'

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as any)

      await apiClient.deleteSetting(settingId)

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/settings/${settingId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Delivery API', () => {
    beforeEach(() => {
      mockAuth.currentUser = { getIdToken: mockGetIdToken }
    })

    it('should trigger instant content delivery for specific setting', async () => {
      const settingId = 'setting-1'
      const mockResponse = {
        settingId,
        categoryName: 'Test Category',
        content: 'Generated content',
        query: 'Test query',
        generatedAt: new Date().toISOString(),
        success: true,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await apiClient.instantContentDelivery(settingId)

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/delivery/content/${settingId}`,
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should trigger instant content delivery for all settings', async () => {
      const mockResponse = {
        contents: [{
          settingId: 'setting-1',
          categoryName: 'Test Category',
          content: 'Generated content',
          query: 'Test query',
          generatedAt: new Date().toISOString(),
          success: true,
        }],
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        errors: [],
        generatedAt: new Date().toISOString(),
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await apiClient.instantContentDeliveryAll()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/delivery/content/all',
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should get content archive with filters', async () => {
      const filters = {
        limit: 20,
        categoryName: 'Test Category',
        searchText: 'search term',
        sortBy: 'deliveredAt' as const,
        sortOrder: 'desc' as const,
      }

      const mockArchive = {
        logs: [{
          id: 'log-1',
          userId: 'user-1',
          categoryName: 'Test Category',
          deliveryType: 'instant' as const,
          status: 'success' as const,
          deliveredAt: new Date().toISOString(),
          fullContent: 'Test content',
        }],
        totalCount: 1,
        categories: ['Test Category'],
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockArchive),
      } as any)

      const result = await apiClient.getContentArchive(filters)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/delivery/archive'),
        expect.any(Object)
      )
      
      // URLパラメータの確認
      const call = vi.mocked(fetch).mock.calls[0]
      const url = call[0] as string
      expect(url).toContain('limit=20')
      expect(url).toContain('categoryName=Test%20Category')
      expect(url).toContain('searchText=search%20term')
      expect(url).toContain('sortBy=deliveredAt')
      expect(url).toContain('sortOrder=desc')
      
      expect(result).toEqual(mockArchive)
    })

    it('should delete delivery log', async () => {
      const logId = 'log-1'
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Content deleted successfully' }),
      } as any)

      const result = await apiClient.deleteDeliveryLog(logId)

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3000/delivery/logs/${logId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result).toEqual({ message: 'Content deleted successfully' })
    })

    it('should batch delete delivery logs', async () => {
      const logIds = ['log-1', 'log-2', 'log-3']
      const mockResponse = {
        message: '3 content items deleted successfully',
        successful: 3,
        failed: 0,
        deletedIds: logIds,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await apiClient.batchDeleteDeliveryLogs(logIds)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/delivery/logs/batch',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ logIds }),
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.currentUser = { getIdToken: mockGetIdToken }
    })

    it('should throw error on API failure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      } as any)

      await expect(() => apiClient.getSettings()).rejects.toThrow('API request failed: Internal Server Error')
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      await expect(() => apiClient.getSettings()).rejects.toThrow('Network error')
    })
  })
})