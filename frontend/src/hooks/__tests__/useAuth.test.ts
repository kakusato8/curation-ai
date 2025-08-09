import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '../useAuth'
import * as firebaseAuth from 'firebase/auth'
import { apiClient } from '../../utils/api'

// Mock Firebase Auth
vi.mock('firebase/auth')
vi.mock('../../utils/api')

describe('useAuth', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('test-token'),
  }

  let authStateCallback: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Firebase Auth モックの設定
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(
      (auth, callback) => {
        authStateCallback = callback
        // 初期状態では未認証だが、loadingは最初trueであることを確認
        setTimeout(() => callback(null), 0)
        return vi.fn() // unsubscribe function
      }
    )
    
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
      user: mockUser,
    } as any)
    
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
      user: mockUser,
    } as any)
    
    vi.mocked(firebaseAuth.signOut).mockResolvedValue()
  })

  it('should initialize with loading state', async () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    
    // Wait for auth state to settle
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should set loading to false after auth state is determined', async () => {
    const { result } = renderHook(() => useAuth())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should handle successful login', async () => {
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
      user: mockUser,
    } as any)

    const { result } = renderHook(() => useAuth())

    await result.current.login('test@example.com', 'password')

    expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.any(Object),
      'test@example.com',
      'password'
    )
  })

  it('should handle login error', async () => {
    const mockError = new Error('Invalid credentials')
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValue(mockError)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await expect(result.current.login('test@example.com', 'wrong-password')).rejects.toThrow('Invalid credentials')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid credentials')
    })
  })

  it('should handle successful registration', async () => {
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
      user: mockUser,
    } as any)
    vi.mocked(apiClient.registerUser).mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await result.current.register('test@example.com', 'password')

    expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.any(Object),
      'test@example.com',
      'password'
    )
    expect(apiClient.registerUser).toHaveBeenCalledWith('test-uid', 'test@example.com')
  })

  it('should handle registration error', async () => {
    const mockError = new Error('Email already in use')
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValue(mockError)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await expect(result.current.register('test@example.com', 'password')).rejects.toThrow('Email already in use')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Email already in use')
    })
    expect(apiClient.registerUser).not.toHaveBeenCalled()
  })

  it('should handle successful logout', async () => {
    vi.mocked(firebaseAuth.signOut).mockResolvedValue()

    const { result } = renderHook(() => useAuth())

    await result.current.logout()

    expect(firebaseAuth.signOut).toHaveBeenCalledWith(expect.any(Object))
  })

  it('should handle logout error', async () => {
    const mockError = new Error('Logout failed')
    vi.mocked(firebaseAuth.signOut).mockRejectedValue(mockError)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow('Logout failed')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Logout failed')
    })
  })

  it('should update user when auth state changes', async () => {
    let authCallback: any

    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(
      (auth, callback) => {
        authCallback = callback
        return vi.fn()
      }
    )

    const { result } = renderHook(() => useAuth())

    // Simulate user login
    authCallback(mockUser)

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
    })

    // Simulate user logout
    authCallback(null)

    await waitFor(() => {
      expect(result.current.user).toBeNull()
    })
  })

  it('should cleanup auth listener on unmount', () => {
    const mockUnsubscribe = vi.fn()
    vi.mocked(firebaseAuth.onAuthStateChanged).mockReturnValue(mockUnsubscribe)

    const { unmount } = renderHook(() => useAuth())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})