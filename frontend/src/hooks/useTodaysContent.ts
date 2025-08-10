import { useState, useEffect } from 'react';
import { DeliveryLog, apiClient, ContentArchiveFilters } from '../utils/api';

interface TodaysContentState {
  content: DeliveryLog[];
  loading: boolean;
  error: string | null;
}

export const useTodaysContent = () => {
  const [state, setState] = useState<TodaysContentState>({
    content: [],
    loading: true,
    error: null,
  });

  const loadTodaysContent = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // 日本時間で本日の開始と終了時刻を設定
      const now = new Date();
      
      // 日本時間での今日の日付を取得
      const jstOffset = 9 * 60; // JST = UTC + 9 hours (in minutes)
      const localTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const jstTime = localTime + (jstOffset * 60000);
      const jstDate = new Date(jstTime);
      
      // JST基準での本日の開始と終了を計算
      const startOfDay = new Date(jstDate.getFullYear(), jstDate.getMonth(), jstDate.getDate());
      const endOfDay = new Date(jstDate.getFullYear(), jstDate.getMonth(), jstDate.getDate() + 1);

      const filters: ContentArchiveFilters = {
        startDate: startOfDay,
        endDate: endOfDay,
        sortBy: 'deliveredAt',
        sortOrder: 'desc',
      };

      console.log('Today\'s content filter (JST-based):', {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        currentJST: jstDate.toISOString(),
        currentUTC: now.toISOString()
      });

      const result = await apiClient.getContentArchive(filters);
      
      console.log('Today\'s content results:', {
        totalLogs: result.logs.length,
        logs: result.logs.map(log => ({
          id: log.id,
          categoryName: log.categoryName,
          deliveredAt: log.deliveredAt,
          deliveredAtISO: new Date(log.deliveredAt).toISOString()
        }))
      });
      
      setState({
        content: result.logs,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load today\'s content:', error);
      setState({
        content: [],
        loading: false,
        error: error instanceof Error ? error.message : '本日のコンテンツの取得に失敗しました',
      });
    }
  };

  useEffect(() => {
    loadTodaysContent();
  }, []);

  return {
    ...state,
    refresh: loadTodaysContent,
  };
};