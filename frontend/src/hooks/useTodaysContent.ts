import { useState, useEffect } from 'react';
import { DeliveryLog, apiClient, ContentArchiveFilters } from '../utils/api';
import { parseFirestoreDate } from '../utils/dateUtils';

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
      
      // 日本時間（JST）で本日の開始と終了時刻を設定
      const now = new Date();
      
      // JST（UTC+9）での今日の日付を正確に取得（改良版）
      const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒で
      const jstTime = new Date(now.getTime() + jstOffset);
      
      // JST基準での本日00:00:00から翌日00:00:00までのUTC時間を計算
      // JST 00:00 = UTC 15:00 (前日) なので、前日の15時から当日の15時まで
      const jstYear = jstTime.getUTCFullYear();
      const jstMonth = jstTime.getUTCMonth();
      const jstDate = jstTime.getUTCDate();
      
      // JST基準の日付から、UTC時間での範囲を計算
      const startOfDay = new Date(Date.UTC(jstYear, jstMonth, jstDate));
      startOfDay.setUTCHours(15, 0, 0, 0); // JST 00:00 = UTC 15:00
      startOfDay.setUTCDate(startOfDay.getUTCDate() - 1); // 前日の15:00
      
      const endOfDay = new Date(Date.UTC(jstYear, jstMonth, jstDate));
      endOfDay.setUTCHours(15, 0, 0, 0); // JST 00:00 = UTC 15:00 (当日)

      const filters: ContentArchiveFilters = {
        startDate: startOfDay,
        endDate: endOfDay,
        sortBy: 'deliveredAt',
        sortOrder: 'desc',
      };

      console.log('Today\'s content filter (JST-based):', {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        currentJST: jstTime.toISOString(),
        currentUTC: now.toISOString(),
        jstDateString: jstTime.toDateString()
      });

      // デバッグ用：フィルタなしで全てのログを取得して確認
      console.log('🔍 Debug: Fetching all logs without date filter...');
      const debugResult = await apiClient.getContentArchive({
        sortBy: 'deliveredAt',
        sortOrder: 'desc',
        limit: 10
      });
      console.log('🔍 Total logs in database:', debugResult.logs.length);
      if (debugResult.logs.length > 0) {
        console.log('🔍 Recent log dates:', debugResult.logs.map(log => ({
          id: log.id,
          category: log.categoryName,
          deliveredAt: log.deliveredAt,
          deliveredAtISO: parseFirestoreDate(log.deliveredAt)?.toISOString() || 'Invalid Date'
        })));
      }

      // まず全データを取得してデバッグ
      const allDataResult = await apiClient.getContentArchive({ sortBy: 'deliveredAt', sortOrder: 'desc', limit: 10 });
      console.log('🔍 All delivery logs (latest 10):', {
        total: allDataResult.logs.length,
        logs: allDataResult.logs.map(log => ({
          id: log.id,
          categoryName: log.categoryName,
          deliveredAt: log.deliveredAt,
          deliveredAtISO: parseFirestoreDate(log.deliveredAt)?.toISOString() || 'Invalid Date',
          isToday: (() => {
            const logDate = parseFirestoreDate(log.deliveredAt);
            return logDate && !isNaN(logDate.getTime()) ? (logDate >= startOfDay && logDate < endOfDay) : false;
          })()
        }))
      });

      const result = await apiClient.getContentArchive(filters);
      
      console.log('📅 Today\'s content results (filtered):', {
        dateRange: {
          startISO: startOfDay.toISOString(),
          endISO: endOfDay.toISOString(),
          jstToday: jstTime.toISOString()
        },
        totalLogsFound: result.logs.length,
        logs: result.logs.map(log => ({
          id: log.id,
          categoryName: log.categoryName,
          deliveredAt: log.deliveredAt,
          deliveredAtISO: parseFirestoreDate(log.deliveredAt)?.toISOString() || 'Invalid Date'
        }))
      });
      
      // デバッグ用：フィルタリング結果の詳細
      if (result.logs.length === 0 && allDataResult.logs.length > 0) {
        console.warn('⚠️ Logs exist but none match today\'s filter!');
        console.log('🔍 Date range check for existing logs:');
        allDataResult.logs.forEach(log => {
          const logDate = parseFirestoreDate(log.deliveredAt);
          if (logDate && !isNaN(logDate.getTime())) {
            const inRange = logDate >= startOfDay && logDate < endOfDay;
            console.log(`  ${log.categoryName}: ${logDate.toISOString()} → In range: ${inRange}`);
          } else {
            console.log(`  ${log.categoryName}: Invalid date (${log.deliveredAt}) → In range: false`);
          }
        });
      }
      
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