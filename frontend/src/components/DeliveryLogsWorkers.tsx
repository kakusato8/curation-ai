import React, { useState, useEffect } from 'react';
import { DeliveryLog, apiClient } from '../utils/api-workers';
import { formatDate } from '../utils/dateUtils';

export const DeliveryLogsWorkers: React.FC = () => {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDeliveryLogs();
      setLogs(response.logs);
    } catch (error) {
      console.error('Failed to load delivery logs:', error);
      setError('配信ログの読み込みに失敗しました: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };


  const getStatusText = (status: string) => {
    return status === 'success' ? '成功' : '失敗';
  };

  const getDeliveryTypeText = (type: string) => {
    return type === 'scheduled' ? '自動配信' : '即時配信';
  };

  if (loading) {
    return <div className="delivery-logs loading">配信ログを読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="delivery-logs error">
        <p>{error}</p>
        <button onClick={loadLogs}>再試行</button>
      </div>
    );
  }

  return (
    <div className="delivery-logs">
      <div className="logs-header">
        <h3>配信ログ</h3>
        <div>
          <span style={{ fontSize: '12px', color: '#666', marginRight: '10px' }}>
            (Cloudflare Workers KV)
          </span>
          <button onClick={loadLogs}>更新</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p>配信ログがありません。</p>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>配信日時</th>
                <th>タイプ</th>
                <th>ステータス</th>
                <th>内容</th>
                <th>エラー</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index} className={`status-${log.status}`}>
                  <td>{formatDate(log.deliveredAt)}</td>
                  <td>{getDeliveryTypeText(log.deliveryType)}</td>
                  <td>
                    <span className={`status-badge ${log.status}`}>
                      {getStatusText(log.status)}
                    </span>
                  </td>
                  <td>
                    {log.contentSummary && (
                      <div className="content-summary" title={log.contentSummary}>
                        {log.contentSummary.length > 50 
                          ? `${log.contentSummary.substring(0, 50)}...`
                          : log.contentSummary
                        }
                      </div>
                    )}
                  </td>
                  <td>
                    {log.errorMessage && (
                      <div className="error-message" title={log.errorMessage}>
                        {log.errorMessage.length > 30
                          ? `${log.errorMessage.substring(0, 30)}...`
                          : log.errorMessage
                        }
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};