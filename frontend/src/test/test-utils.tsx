import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import type { UserSetting, DeliveryLog } from '../utils/api'

// テスト用のProvider wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// テストデータファクトリー
export const createMockUserSetting = (overrides?: Partial<UserSetting>): UserSetting => ({
  id: 'setting-1',
  categoryName: 'テストカテゴリ',
  geminiQuery: 'テストクエリ',
  frequency: 'daily',
  ...overrides,
})

export const createMockDeliveryLog = (overrides?: Partial<DeliveryLog>): DeliveryLog => ({
  id: 'log-1',
  userId: 'user-1',
  settingId: 'setting-1',
  categoryName: 'テストカテゴリ',
  geminiQuery: 'テストクエリ',
  deliveryType: 'instant',
  status: 'success',
  deliveredAt: new Date().toISOString(),
  contentSummary: 'テストコンテンツ要約',
  fullContent: 'テストコンテンツ全文',
  generatedAt: new Date().toISOString(),
  ...overrides,
})

// APIクライアントのモックファクトリー
export const createMockApiClient = () => ({
  getSettings: vi.fn().mockResolvedValue({
    userId: 'user-1',
    settings: [createMockUserSetting()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  createSetting: vi.fn().mockResolvedValue(createMockUserSetting()),
  updateSetting: vi.fn().mockResolvedValue(createMockUserSetting()),
  deleteSetting: vi.fn().mockResolvedValue(undefined),
  instantContentDelivery: vi.fn().mockResolvedValue({
    settingId: 'setting-1',
    categoryName: 'テストカテゴリ',
    content: 'テストコンテンツ',
    query: 'テストクエリ',
    generatedAt: new Date().toISOString(),
    success: true,
  }),
  instantContentDeliveryAll: vi.fn().mockResolvedValue({
    contents: [{
      settingId: 'setting-1',
      categoryName: 'テストカテゴリ',
      content: 'テストコンテンツ',
      query: 'テストクエリ',
      generatedAt: new Date().toISOString(),
      success: true,
    }],
    totalProcessed: 1,
    successful: 1,
    failed: 0,
    errors: [],
    generatedAt: new Date().toISOString(),
  }),
  getContentArchive: vi.fn().mockResolvedValue({
    logs: [createMockDeliveryLog()],
    totalCount: 1,
    categories: ['テストカテゴリ'],
  }),
  deleteDeliveryLog: vi.fn().mockResolvedValue({ message: 'Content deleted successfully' }),
  batchDeleteDeliveryLogs: vi.fn().mockResolvedValue({
    message: '1 content items deleted successfully',
    successful: 1,
    failed: 0,
    deletedIds: ['log-1'],
    errors: undefined,
  }),
  getDeliveryLogs: vi.fn().mockResolvedValue({
    logs: [createMockDeliveryLog()],
  }),
  registerUser: vi.fn().mockResolvedValue(undefined),
})

// useAuth フックのモック
export const createMockAuthUser = () => ({
  uid: 'user-1',
  email: 'test@example.com',
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
})

export const createMockUseAuth = () => ({
  user: createMockAuthUser(),
  loading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
})

// MarkdownRenderer コンポーネントのモック
export const mockMarkdownRenderer = vi.fn(({ content }: { content: string }) => (
  <div data-testid="markdown-content">{content}</div>
))