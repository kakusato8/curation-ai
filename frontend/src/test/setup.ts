import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Firebase Auth のモック
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null)
    return vi.fn() // unsubscribe function
  }),
}))

// Firebase App のモック
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}))

// Firebase Firestore のモック
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
}))

// Firebase設定ファイルのモック
vi.mock('../firebase.ts', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}))

// API クライアントのモック
vi.mock('../utils/api.ts', () => ({
  apiClient: {
    getSettings: vi.fn(),
    createSetting: vi.fn(),
    updateSetting: vi.fn(),
    deleteSetting: vi.fn(),
    instantContentDelivery: vi.fn(),
    instantContentDeliveryAll: vi.fn(),
    getContentArchive: vi.fn(),
    deleteDeliveryLog: vi.fn(),
    batchDeleteDeliveryLogs: vi.fn(),
    registerUser: vi.fn(),
    getDeliveryLogs: vi.fn(),
  },
}))

// ResizeObserver のモック (多くのUIライブラリで必要)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// IntersectionObserver のモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Clipboard API のモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
})

// window.matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})