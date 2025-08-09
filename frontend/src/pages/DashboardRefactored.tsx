import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useContentDelivery } from '../hooks/useContentDelivery'
import { SettingsList } from '../components/SettingsList'
import { SettingForm } from '../components/SettingForm'
import { DeliveryLogs } from '../components/DeliveryLogs'
import ContentDisplay from '../components/ContentDisplay'
import DeliveryHistory from '../components/DeliveryHistory'
import { ContentArchiveRefactored } from '../components/ContentArchive/ContentArchiveRefactored'
import { UserSetting } from '../utils/api'

export const DashboardRefactored: React.FC = () => {
  const { user, logout } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingSetting, setEditingSetting] = useState<UserSetting | undefined>()
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'archive'>('settings')
  const [showHistory, setShowHistory] = useState(false)
  const [historyCategory, setHistoryCategory] = useState<string | undefined>()

  // Settings management
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    createSetting,
    updateSetting,
    deleteSetting,
    refreshSettings,
  } = useSettings({
    onError: (error) => console.error('Settings error:', error)
  })

  // Content delivery
  const {
    content: deliveredContent,
    loading: deliveryLoading,
    error: deliveryError,
    visible: showDeliveredContent,
    deliverContent,
    deliverAllContent,
    clearContent,
  } = useContentDelivery({
    onSuccess: (result) => {
      console.log('Content delivery successful:', result)
    },
    onError: (error) => console.error('Content delivery error:', error)
  })

  const handleCreateSetting = async (settingData: Omit<UserSetting, 'id'>) => {
    try {
      await createSetting(settingData)
      setShowForm(false)
    } catch (error) {
      // Error is already handled by the hook
      throw error
    }
  }

  const handleUpdateSetting = async (settingData: Omit<UserSetting, 'id'>) => {
    if (!editingSetting) return
    
    try {
      await updateSetting(editingSetting.id, settingData)
      setShowForm(false)
      setEditingSetting(undefined)
    } catch (error) {
      // Error is already handled by the hook
      throw error
    }
  }

  const handleDeleteSetting = async (id: string) => {
    try {
      await deleteSetting(id)
    } catch (error) {
      alert('設定の削除に失敗しました')
    }
  }

  const handleEditSetting = (setting: UserSetting) => {
    setEditingSetting(setting)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingSetting(undefined)
  }

  const handleInstantContentDelivery = async (settingId: string) => {
    await deliverContent(settingId)
  }

  const handleBatchContentDelivery = async () => {
    await deliverAllContent()
  }

  const handleShowHistory = (categoryName?: string) => {
    setHistoryCategory(categoryName)
    setShowHistory(true)
  }

  const handleCloseHistory = () => {
    setShowHistory(false)
    setHistoryCategory(undefined)
  }

  if (settingsLoading && settings.length === 0) {
    return <div className="dashboard loading">読み込み中...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>個人情報配信システム</h1>
          <div className="user-info">
            <span>ようこそ、{user?.email}さん</span>
            <button onClick={logout} className="logout-btn">ログアウト</button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          配信設定
        </button>
        <button 
          className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          配信ログ
        </button>
        <button 
          className={`nav-tab ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          コンテンツライブラリ
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'settings' && (
          <div className="settings-section">
            {settingsError && <div className="error-message">{settingsError}</div>}
            
            {!showForm && (
              <div className="settings-actions">
                <button 
                  className="add-setting-btn"
                  onClick={() => setShowForm(true)}
                >
                  新しい設定を追加
                </button>
              </div>
            )}

            {showForm ? (
              <SettingForm
                setting={editingSetting}
                onSubmit={editingSetting ? handleUpdateSetting : handleCreateSetting}
                onCancel={handleCancelForm}
              />
            ) : (
              <SettingsList
                settings={settings}
                onEdit={handleEditSetting}
                onDelete={handleDeleteSetting}
                onRefresh={refreshSettings}
                onInstantContent={handleInstantContentDelivery}
                onBatchContent={handleBatchContentDelivery}
                onShowHistory={handleShowHistory}
              />
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-section">
            <div className="logs-actions">
              <button 
                className="btn-secondary"
                onClick={() => handleShowHistory()}
              >
                配信履歴を見る
              </button>
            </div>
            <DeliveryLogs />
          </div>
        )}
        
        {activeTab === 'archive' && (
          <ContentArchiveRefactored 
            onClose={() => setActiveTab('settings')}
          />
        )}
      </main>

      {/* Content Display Modal */}
      {showDeliveredContent && (
        <ContentDisplay
          content={deliveredContent}
          loading={deliveryLoading}
          error={deliveryError}
          onClose={clearContent}
        />
      )}

      {/* Delivery History Modal */}
      {showHistory && (
        <DeliveryHistory
          categoryName={historyCategory}
          onClose={handleCloseHistory}
        />
      )}
    </div>
  )
}