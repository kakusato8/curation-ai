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
      
      // 本日の開始と終了時刻を設定
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const filters: ContentArchiveFilters = {
        startDate: startOfDay,
        endDate: endOfDay,
        sortBy: 'deliveredAt',
        sortOrder: 'desc',
      };

      const result = await apiClient.getContentArchive(filters);
      
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