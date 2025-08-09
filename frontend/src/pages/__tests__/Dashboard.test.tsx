import React from 'react'
import { render, screen, fireEvent, waitFor } from '../../test/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { useAuth } from '../../hooks/useAuth'
import { apiClient } from '../../utils/api'
import { createMockUserSetting, createMockUseAuth, createMockApiClient } from '../../test/test-utils'

// コンポーネントのモック
vi.mock('../../components/SettingsList', () => ({
  SettingsList: ({ settings, onEdit, onDelete, onInstantContent }: any) => (
    <div data-testid="settings-list">
      <div data-testid="settings-count">{settings.length} settings</div>
      {settings.map((setting: any) => (
        <div key={setting.id} data-testid={`setting-${setting.id}`}>
          {setting.categoryName}
          <button onClick={() => onEdit(setting)}>編集</button>
          <button onClick={() => onDelete(setting.id)}>削除</button>
          <button onClick={() => onInstantContent(setting.id)}>即座配信</button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('../../components/SettingForm', () => ({
  SettingForm: ({ setting, onSubmit, onCancel }: any) => (
    <div data-testid="setting-form">
      <div data-testid="form-mode">{setting ? 'edit' : 'create'}</div>
      <button onClick={() => onSubmit({ categoryName: 'Test Category', geminiQuery: 'Test Query', frequency: 'daily' })}>
        送信
      </button>
      <button onClick={onCancel}>キャンセル</button>
    </div>
  ),
}))

vi.mock('../../components/DeliveryLogs', () => ({
  DeliveryLogs: () => <div data-testid="delivery-logs">Delivery Logs</div>,
}))

vi.mock('../../components/ContentDisplay', () => ({
  default: ({ content, loading, error, onClose }: any) => (
    <div data-testid="content-display">
      {loading && <div data-testid="content-loading">Loading...</div>}
      {error && <div data-testid="content-error">{error}</div>}
      {content && <div data-testid="content-data">{JSON.stringify(content)}</div>}
      <button onClick={onClose}>閉じる</button>
    </div>
  ),
}))

vi.mock('../../components/ContentArchive/ContentArchiveRefactored', () => ({
  ContentArchiveRefactored: ({ onClose }: any) => (
    <div data-testid="content-archive">
      <div>Content Archive</div>
      <button onClick={onClose}>閉じる</button>
    </div>
  ),
}))

vi.mock('../../components/DeliveryHistory', () => ({
  default: ({ categoryName, onClose }: any) => (
    <div data-testid="delivery-history">
      <div data-testid="history-category">{categoryName || 'All'}</div>
      <button onClick={onClose}>閉じる</button>
    </div>
  ),
}))

vi.mock('../../hooks/useAuth')

describe('Dashboard', () => {
  const mockApiClient = createMockApiClient()
  const mockUseAuth = createMockUseAuth()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // useAuth フックのモック
    vi.mocked(useAuth).mockReturnValue(mockUseAuth)
    
    // apiClient のモック
    Object.assign(apiClient, mockApiClient)
  })

  it('should render dashboard with user information', async () => {
    // Mock successful settings load
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('個人情報配信システム')).toBeInTheDocument()
      expect(screen.getByText('ようこそ、test@example.comさん')).toBeInTheDocument()
      expect(screen.getByText('ログアウト')).toBeInTheDocument()
    })
  })

  it('should render navigation tabs', async () => {
    // Mock successful settings load
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '配信設定' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '配信ログ' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'コンテンツライブラリ' })).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<Dashboard />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should load and display settings', async () => {
    const mockSettings = [createMockUserSetting()]
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: mockSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-list')).toBeInTheDocument()
      expect(screen.getByTestId('settings-count')).toHaveTextContent('1 settings')
    })

    expect(mockApiClient.getSettings).toHaveBeenCalledTimes(1)
  })

  it('should handle settings loading error', async () => {
    mockApiClient.getSettings.mockRejectedValue(new Error('Failed to load settings'))

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('設定の読み込みに失敗しました')).toBeInTheDocument()
    })
  })

  it('should show form when add setting button is clicked', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('新しい設定を追加')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('新しい設定を追加'))

    expect(screen.getByTestId('setting-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create')
  })

  it('should handle setting creation', async () => {
    const newSetting = {
      categoryName: 'Test Category',
      geminiQuery: 'Test Query',
      frequency: 'daily' as const,
    }

    mockApiClient.createSetting.mockResolvedValue({
      id: 'new-setting-id',
      ...newSetting,
    })

    render(<Dashboard />)

    await waitFor(() => {
      fireEvent.click(screen.getByText('新しい設定を追加'))
    })

    fireEvent.click(screen.getByText('送信'))

    await waitFor(() => {
      expect(mockApiClient.createSetting).toHaveBeenCalledWith(newSetting)
      expect(mockApiClient.getSettings).toHaveBeenCalledTimes(2) // 初期読み込み + 作成後
    })

    // フォームが閉じられることを確認
    expect(screen.queryByTestId('setting-form')).not.toBeInTheDocument()
  })

  it('should handle setting editing', async () => {
    const mockSettings = [createMockUserSetting()]
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: mockSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-list')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('編集'))

    expect(screen.getByTestId('setting-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit')
  })

  it('should handle setting deletion', async () => {
    const mockSettings = [createMockUserSetting()]
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: mockSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-list')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('削除'))

    await waitFor(() => {
      expect(mockApiClient.deleteSetting).toHaveBeenCalledWith('setting-1')
      expect(mockApiClient.getSettings).toHaveBeenCalledTimes(2) // 初期読み込み + 削除後
    })
  })

  it('should handle instant content delivery', async () => {
    const mockSettings = [createMockUserSetting()]
    const mockContentResponse = {
      settingId: 'setting-1',
      categoryName: 'テストカテゴリ',
      content: 'Generated content',
      query: 'テストクエリ',
      generatedAt: new Date().toISOString(),
      success: true,
    }

    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: mockSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    mockApiClient.instantContentDelivery.mockResolvedValue(mockContentResponse)

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-list')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('即座配信'))

    await waitFor(() => {
      expect(mockApiClient.instantContentDelivery).toHaveBeenCalledWith('setting-1')
      expect(screen.getByTestId('content-display')).toBeInTheDocument()
      expect(screen.getByTestId('content-data')).toHaveTextContent(JSON.stringify(mockContentResponse))
    })
  })

  it('should switch between tabs', async () => {
    render(<Dashboard />)

    // 初期状態では設定タブがアクティブ
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '配信設定' })).toHaveClass('active')
    })

    // ログタブに切り替え
    fireEvent.click(screen.getByRole('button', { name: '配信ログ' }))

    expect(screen.getByRole('button', { name: '配信ログ' })).toHaveClass('active')
    expect(screen.getByTestId('delivery-logs')).toBeInTheDocument()

    // ライブラリタブに切り替え
    fireEvent.click(screen.getByRole('button', { name: 'コンテンツライブラリ' }))

    expect(screen.getByRole('button', { name: 'コンテンツライブラリ' })).toHaveClass('active')
    expect(screen.getByTestId('content-archive')).toBeInTheDocument()
  })

  it('should handle logout', async () => {
    // Mock successful settings load
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('ログアウト')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ログアウト'))

    expect(mockUseAuth.logout).toHaveBeenCalled()
  })

  it('should handle content display close', async () => {
    const mockSettings = [createMockUserSetting()]
    mockApiClient.getSettings.mockResolvedValue({
      userId: 'user-1',
      settings: mockSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    mockApiClient.instantContentDelivery.mockResolvedValue({
      settingId: 'setting-1',
      categoryName: 'テストカテゴリ',
      content: 'Generated content',
      query: 'テストクエリ',
      generatedAt: new Date().toISOString(),
      success: true,
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-list')).toBeInTheDocument()
    })

    // コンテンツ配信を実行
    fireEvent.click(screen.getByText('即座配信'))

    await waitFor(() => {
      expect(screen.getByTestId('content-display')).toBeInTheDocument()
    })

    // コンテンツ表示を閉じる
    fireEvent.click(screen.getByText('閉じる'))

    expect(screen.queryByTestId('content-display')).not.toBeInTheDocument()
  })
})