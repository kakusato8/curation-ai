import React, { useState, useEffect } from 'react';
import { useAuthWorkers } from '../hooks/useAuthWorkers';
import { SettingsList } from '../components/SettingsList';
import { SettingForm } from '../components/SettingForm';
import { DeliveryLogs } from '../components/DeliveryLogs';
import { UserSetting, UserSettings, apiClient } from '../utils/api-workers';

export const DashboardWorkers: React.FC = () => {
  const { user, logout } = useAuthWorkers();
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState<UserSetting | undefined>();
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

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
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
              (Cloudflare Workers 版)
            </span>
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
              />
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-section">
            <DeliveryLogs />
          </div>
        )}
      </main>
    </div>
  );
};