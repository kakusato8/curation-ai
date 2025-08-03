import React, { useState } from 'react';
import { UserSetting, apiClient } from '../utils/api-workers';

interface SettingsListProps {
  settings: UserSetting[];
  onEdit: (setting: UserSetting) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const SettingsListWorkers: React.FC<SettingsListProps> = ({ 
  settings, 
  onEdit, 
  onDelete, 
  onRefresh 
}) => {
  const [loadingDelivery, setLoadingDelivery] = useState<string | null>(null);

  const getFrequencyText = (setting: UserSetting) => {
    switch (setting.frequency) {
      case 'daily':
        return '毎日';
      case 'weekly':
        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
        return `毎週${weekDays[setting.weeklyDay || 0]}曜日`;
      case 'monthly':
        return `毎月${setting.monthlyDay || 1}日`;
      default:
        return setting.frequency;
    }
  };

  const handleInstantDelivery = async (settingId: string) => {
    try {
      setLoadingDelivery(settingId);
      await apiClient.instantDelivery(settingId);
      alert('即時配信を開始しました');
    } catch (error) {
      console.error('Instant delivery failed:', error);
      alert('配信に失敗しました: ' + (error as Error).message);
    } finally {
      setLoadingDelivery(null);
    }
  };

  const handleInstantDeliveryAll = async () => {
    try {
      setLoadingDelivery('all');
      await apiClient.instantDeliveryAll();
      alert('全設定の即時配信を開始しました');
    } catch (error) {
      console.error('Instant delivery all failed:', error);
      alert('配信に失敗しました: ' + (error as Error).message);
    } finally {
      setLoadingDelivery(null);
    }
  };

  if (settings.length === 0) {
    return (
      <div className="settings-list empty">
        <p>設定がまだありません。新しい設定を追加してください。</p>
      </div>
    );
  }

  return (
    <div className="settings-list">
      <div className="list-header">
        <h3>配信設定一覧</h3>
        <button 
          className="instant-delivery-all"
          onClick={handleInstantDeliveryAll}
          disabled={loadingDelivery !== null}
        >
          {loadingDelivery === 'all' ? '配信中...' : '全設定を即時配信'}
        </button>
      </div>

      <div className="settings-grid">
        {settings.map((setting) => (
          <div key={setting.id} className="setting-card">
            <div className="setting-header">
              <h4>{setting.categoryName}</h4>
              <div className="setting-actions">
                <button
                  className="edit-btn"
                  onClick={() => onEdit(setting)}
                  disabled={loadingDelivery !== null}
                >
                  編集
                </button>
                <button
                  className="delete-btn"
                  onClick={() => {
                    if (confirm('この設定を削除しますか？')) {
                      onDelete(setting.id);
                    }
                  }}
                  disabled={loadingDelivery !== null}
                >
                  削除
                </button>
              </div>
            </div>
            
            <div className="setting-content">
              <p className="frequency">{getFrequencyText(setting)}</p>
              <p className="query">{setting.geminiQuery}</p>
            </div>
            
            <div className="setting-footer">
              <button
                className="instant-delivery-btn"
                onClick={() => handleInstantDelivery(setting.id)}
                disabled={loadingDelivery !== null}
              >
                {loadingDelivery === setting.id ? '配信中...' : '即時配信'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};