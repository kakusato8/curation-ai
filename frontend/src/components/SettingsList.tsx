import React, { useState, useEffect } from 'react';
import { UserSetting, apiClient } from '../utils/api';

interface SettingsListProps {
  settings: UserSetting[];
  onEdit: (setting: UserSetting) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onInstantContent: (settingId: string) => void;
  onBatchContent: () => void;
}

export const SettingsList: React.FC<SettingsListProps> = ({ 
  settings, 
  onEdit, 
  onDelete, 
  onRefresh,
  onInstantContent,
  onBatchContent
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

  const handleInstantContent = (settingId: string) => {
    onInstantContent(settingId);
  };

  const handleBatchContent = () => {
    onBatchContent();
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
          onClick={handleBatchContent}
        >
          全設定のコンテンツを生成
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
                onClick={() => handleInstantContent(setting.id)}
              >
                コンテンツ生成
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};