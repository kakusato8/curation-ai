import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SettingsList } from '../components/SettingsList';
import { SettingForm } from '../components/SettingForm';
import { DeliveryLogs } from '../components/DeliveryLogs';
import ContentDisplay from '../components/ContentDisplay';
import DeliveryHistory from '../components/DeliveryHistory';
import ContentArchive from '../components/ContentArchive';
import { UserSetting, UserSettings, apiClient, DeliveryContentResponse, BatchDeliveryResponse } from '../utils/api';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState<UserSetting | undefined>();
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'archive'>('settings');
  const [showHistory, setShowHistory] = useState(false);
  const [historyCategory, setHistoryCategory] = useState<string | undefined>();
  
  // Content display state
  const [contentDisplay, setContentDisplay] = useState<{
    content: DeliveryContentResponse | BatchDeliveryResponse | null;
    loading: boolean;
    error: string | null;
    visible: boolean;
  }>({
    content: null,
    loading: false,
    error: null,
    visible: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const userSettings = await apiClient.getSettings();
      setSettings(userSettings?.settings || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async (settingData: Omit<UserSetting, 'id'>) => {
    try {
      await apiClient.createSetting(settingData);
      await loadSettings();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create setting:', error);
      throw error;
    }
  };

  const handleUpdateSetting = async (settingData: Omit<UserSetting, 'id'>) => {
    if (!editingSetting) return;
    
    try {
      await apiClient.updateSetting(editingSetting.id, settingData);
      await loadSettings();
      setShowForm(false);
      setEditingSetting(undefined);
    } catch (error) {
      console.error('Failed to update setting:', error);
      throw error;
    }
  };

  const handleDeleteSetting = async (id: string) => {
    try {
      await apiClient.deleteSetting(id);
      await loadSettings();
    } catch (error) {
      console.error('Failed to delete setting:', error);
      alert('設定の削除に失敗しました');
    }
  };

  const handleEditSetting = (setting: UserSetting) => {
    setEditingSetting(setting);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSetting(undefined);
  };

  // New content delivery handlers
  const handleInstantContentDelivery = async (settingId: string) => {
    setContentDisplay({
      content: null,
      loading: true,
      error: null,
      visible: true,
    });

    try {
      const content = await apiClient.instantContentDelivery(settingId);
      setContentDisplay({
        content,
        loading: false,
        error: null,
        visible: true,
      });
    } catch (error) {
      console.error('Content delivery failed:', error);
      setContentDisplay({
        content: null,
        loading: false,
        error: error instanceof Error ? error.message : 'コンテンツの生成に失敗しました',
        visible: true,
      });
    }
  };

  const handleBatchContentDelivery = async () => {
    setContentDisplay({
      content: null,
      loading: true,
      error: null,
      visible: true,
    });

    try {
      const content = await apiClient.instantContentDeliveryAll();
      setContentDisplay({
        content,
        loading: false,
        error: null,
        visible: true,
      });
    } catch (error) {
      console.error('Batch content delivery failed:', error);
      setContentDisplay({
        content: null,
        loading: false,
        error: error instanceof Error ? error.message : 'コンテンツの生成に失敗しました',
        visible: true,
      });
    }
  };

  const handleCloseContentDisplay = () => {
    setContentDisplay({
      content: null,
      loading: false,
      error: null,
      visible: false,
    });
  };

  const handleShowHistory = (categoryName?: string) => {
    setHistoryCategory(categoryName);
    setShowHistory(true);
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
    setHistoryCategory(undefined);
  };
  

  if (loading) {
    return <div className="dashboard loading">読み込み中...</div>;
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
            {error && <div className="error-message">{error}</div>}
            
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
                onRefresh={loadSettings}
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
          <ContentArchive 
            onClose={() => setActiveTab('settings')}
          />
        )}
      </main>

      {/* Content Display Modal */}
      {contentDisplay.visible && (
        <ContentDisplay
          content={contentDisplay.content}
          loading={contentDisplay.loading}
          error={contentDisplay.error}
          onClose={handleCloseContentDisplay}
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
  );
};