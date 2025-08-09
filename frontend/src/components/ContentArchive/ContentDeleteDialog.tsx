import React from 'react'

interface ContentDeleteDialogProps {
  isVisible: boolean
  deleteType: 'single' | 'batch'
  itemCount?: number
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ContentDeleteDialog: React.FC<ContentDeleteDialogProps> = ({
  isVisible,
  deleteType,
  itemCount = 0,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!isVisible) return null

  return (
    <div className="delete-confirmation-overlay">
      <div className="delete-confirmation-modal">
        <h4>削除の確認</h4>
        <p>
          {deleteType === 'single' 
            ? 'このコンテンツを削除しますか？'
            : `選択された${itemCount}件のコンテンツを削除しますか？`
          }
        </p>
        <p className="delete-warning">
          この操作は取り消せません。
        </p>
        <div className="delete-confirmation-actions">
          <button 
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button 
            className="btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '削除中...' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  )
}