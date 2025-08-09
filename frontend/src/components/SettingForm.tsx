import React, { useState } from 'react';
import { UserSetting } from '../utils/api';

interface SettingFormProps {
  setting?: UserSetting;
  onSubmit: (setting: Omit<UserSetting, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export const SettingForm: React.FC<SettingFormProps> = ({ setting, onSubmit, onCancel }) => {
  const [categoryName, setCategoryName] = useState(setting?.categoryName || '');
  const [geminiQuery, setGeminiQuery] = useState(setting?.geminiQuery || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(setting?.frequency || 'daily');
  const [weeklyDay, setWeeklyDay] = useState(setting?.weeklyDay || 0);
  const [monthlyDay, setMonthlyDay] = useState(setting?.monthlyDay || 1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newSetting: Omit<UserSetting, 'id'> = {
        categoryName,
        geminiQuery,
        frequency,
        ...(frequency === 'weekly' && { weeklyDay }),
        ...(frequency === 'monthly' && { monthlyDay }),
      };

      await onSubmit(newSetting);
    } catch (error) {
      console.error('Error saving setting:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = [
    { value: 0, label: '日曜日' },
    { value: 1, label: '月曜日' },
    { value: 2, label: '火曜日' },
    { value: 3, label: '水曜日' },
    { value: 4, label: '木曜日' },
    { value: 5, label: '金曜日' },
    { value: 6, label: '土曜日' },
  ];

  return (
    <div className="setting-form">
      <h3>{setting ? '設定を編集' : '新しい設定を追加'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="categoryName">カテゴリ名</label>
          <input
            type="text"
            id="categoryName"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="例: 流行っている漫画の情報"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="geminiQuery">検索クエリ</label>
          <textarea
            id="geminiQuery"
            value={geminiQuery}
            onChange={(e) => setGeminiQuery(e.target.value)}
            placeholder="例: 最新の人気漫画やトレンドになっている漫画作品について教えて"
            required
            disabled={loading}
            rows={9}
          />
        </div>

        <div className="form-group">
          <label htmlFor="frequency">配信頻度</label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
            disabled={loading}
          >
            <option value="daily">毎日</option>
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
          </select>
        </div>

        {frequency === 'weekly' && (
          <div className="form-group">
            <label htmlFor="weeklyDay">配信曜日</label>
            <select
              id="weeklyDay"
              value={weeklyDay}
              onChange={(e) => setWeeklyDay(Number(e.target.value))}
              disabled={loading}
            >
              {weekDays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {frequency === 'monthly' && (
          <div className="form-group">
            <label htmlFor="monthlyDay">配信日</label>
            <select
              id="monthlyDay"
              value={monthlyDay}
              onChange={(e) => setMonthlyDay(Number(e.target.value))}
              disabled={loading}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}日
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={loading}>
            キャンセル
          </button>
          <button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
};