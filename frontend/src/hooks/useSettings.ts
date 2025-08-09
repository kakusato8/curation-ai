import { useState, useEffect, useCallback } from 'react'
import { apiClient, UserSetting, UserSettings } from '../utils/api'

export interface UseSettingsOptions {
  onError?: (error: string) => void
  autoLoad?: boolean
}

export interface UseSettingsReturn {
  settings: UserSetting[]
  loading: boolean
  error: string | null
  
  // Actions
  loadSettings: () => Promise<void>
  createSetting: (settingData: Omit<UserSetting, 'id'>) => Promise<void>
  updateSetting: (id: string, settingData: Partial<Omit<UserSetting, 'id'>>) => Promise<void>
  deleteSetting: (id: string) => Promise<void>
  refreshSettings: () => Promise<void>
  
  // Utilities
  findSettingById: (id: string) => UserSetting | undefined
  settingsCount: number
}

export const useSettings = (options: UseSettingsOptions = {}): UseSettingsReturn => {
  const { onError, autoLoad = true } = options
  
  const [settings, setSettings] = useState<UserSetting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage
    setError(errorMessage)
    if (onError) {
      onError(errorMessage)
    }
    console.error('Settings operation error:', error)
  }, [onError])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const userSettings = await apiClient.getSettings()
      setSettings(userSettings?.settings || [])
    } catch (error) {
      handleError(error, '設定の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const createSetting = useCallback(async (settingData: Omit<UserSetting, 'id'>) => {
    try {
      setError(null)
      const newSetting = await apiClient.createSetting(settingData)
      setSettings(prev => [...prev, newSetting])
    } catch (error) {
      handleError(error, '設定の作成に失敗しました')
      throw error
    }
  }, [handleError])

  const updateSetting = useCallback(async (id: string, settingData: Partial<Omit<UserSetting, 'id'>>) => {
    try {
      setError(null)
      const updatedSetting = await apiClient.updateSetting(id, settingData)
      setSettings(prev => prev.map(setting => 
        setting.id === id ? updatedSetting : setting
      ))
    } catch (error) {
      handleError(error, '設定の更新に失敗しました')
      throw error
    }
  }, [handleError])

  const deleteSetting = useCallback(async (id: string) => {
    try {
      setError(null)
      await apiClient.deleteSetting(id)
      setSettings(prev => prev.filter(setting => setting.id !== id))
    } catch (error) {
      handleError(error, '設定の削除に失敗しました')
      throw error
    }
  }, [handleError])

  const refreshSettings = useCallback(async () => {
    await loadSettings()
  }, [loadSettings])

  const findSettingById = useCallback((id: string): UserSetting | undefined => {
    return settings.find(setting => setting.id === id)
  }, [settings])

  // Auto-load settings on mount
  useEffect(() => {
    if (autoLoad) {
      loadSettings()
    }
  }, [autoLoad, loadSettings])

  return {
    settings,
    loading,
    error,
    loadSettings,
    createSetting,
    updateSetting,
    deleteSetting,
    refreshSettings,
    findSettingById,
    settingsCount: settings.length,
  }
}