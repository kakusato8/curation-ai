import React, { useState, useEffect } from 'react';
import { UserSetting, apiClient } from '../utils/api';

interface SettingsListProps {
  settings: UserSetting[];
  onEdit: (setting: UserSetting) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onInstantContent: (settingId: string) => void;
  onBatchContent: () => void;
  onShowHistory?: (categoryName: string) => void;
  onReorder?: (settingIds: string[]) => void;
}

export const SettingsList: React.FC<SettingsListProps> = ({ 
  settings, 
  onEdit, 
  onDelete, 
  onRefresh,
  onInstantContent,
  onBatchContent,
  onShowHistory,
  onReorder
}) => {
  const [loadingDelivery, setLoadingDelivery] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ settingId: string; groupType: string; index: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ groupType: string; index: number } | null>(null);

  // Group settings by frequency
  const groupedSettings = React.useMemo(() => {
    const daily = settings.filter(s => s.frequency === 'daily');
    const weekly = settings.filter(s => s.frequency === 'weekly');
    const monthly = settings.filter(s => s.frequency === 'monthly');
    
    return {
      daily: { title: '毎日', settings: daily },
      weekly: { title: '毎週', settings: weekly },
      monthly: { title: '毎月', settings: monthly }
    };
  }, [settings]);

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

  const handleDragStart = (e: React.DragEvent, setting: UserSetting, groupType: string, index: number) => {
    setDraggedItem({ settingId: setting.id, groupType, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, groupType: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem({ groupType, index });
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, dropGroupType: string, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || !onReorder || draggedItem.groupType !== dropGroupType) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    if (draggedItem.index === dropIndex) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Only reorder within the same group
    const groupSettings = groupedSettings[dropGroupType as keyof typeof groupedSettings].settings;
    const newGroupSettings = [...groupSettings];
    const draggedSetting = newGroupSettings[draggedItem.index];
    
    // Remove dragged item
    newGroupSettings.splice(draggedItem.index, 1);
    // Insert at new position
    newGroupSettings.splice(dropIndex, 0, draggedSetting);
    
    // Reconstruct the full settings array maintaining group order
    const newSettings = [
      ...groupedSettings.daily.settings.filter(s => dropGroupType !== 'daily'),
      ...(dropGroupType === 'daily' ? newGroupSettings : []),
      ...groupedSettings.weekly.settings.filter(s => dropGroupType !== 'weekly'), 
      ...(dropGroupType === 'weekly' ? newGroupSettings : []),
      ...groupedSettings.monthly.settings.filter(s => dropGroupType !== 'monthly'),
      ...(dropGroupType === 'monthly' ? newGroupSettings : [])
    ];
    
    const reorderedIds = newSettings.map(setting => setting.id);
    onReorder(reorderedIds);
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
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

      <div className="settings-groups">
        {Object.entries(groupedSettings).map(([groupType, group]) => (
          group.settings.length > 0 && (
            <div key={groupType} className="settings-group">
              <div className="group-header">
                <h4>{group.title}</h4>
                <span className="group-count">({group.settings.length}件)</span>
              </div>
              
              <div className="settings-grid">
                {group.settings.map((setting, index) => (
                  <div 
                    key={setting.id} 
                    className={`setting-card ${
                      draggedItem?.settingId === setting.id ? 'dragging' : ''
                    } ${
                      dragOverItem?.groupType === groupType && dragOverItem?.index === index ? 'drag-over' : ''
                    }`}
                    draggable={onReorder ? true : false}
                    onDragStart={(e) => handleDragStart(e, setting, groupType, index)}
                    onDragOver={(e) => handleDragOver(e, groupType, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, groupType, index)}
                    onDragEnd={handleDragEnd}
                  >
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
                      {onShowHistory && (
                        <button
                          className="btn-secondary small"
                          onClick={() => onShowHistory(setting.categoryName)}
                        >
                          履歴を見る
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};