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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex || !onReorder) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSettings = [...settings];
    const draggedSetting = newSettings[draggedIndex];
    
    // Remove dragged item
    newSettings.splice(draggedIndex, 1);
    // Insert at new position
    newSettings.splice(dropIndex, 0, draggedSetting);
    
    const reorderedIds = newSettings.map(setting => setting.id);
    onReorder(reorderedIds);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
        {settings.map((setting, index) => (
          <div 
            key={setting.id} 
            className={`setting-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            draggable={onReorder ? true : false}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="setting-header">
              {onReorder && (
                <div className="drag-handle">
                  ⋮⋮
                </div>
              )}
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
  );
};