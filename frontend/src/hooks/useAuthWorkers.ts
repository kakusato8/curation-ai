import { useState, useEffect } from 'react';
import { apiClient } from '../utils/api-workers';

interface User {
  uid: string;
  email: string;
}

export const useAuthWorkers = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = apiClient.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // For simplicity, use email as uid (in real app, would get from Firebase Auth)
      const uid = email.replace('@', '_').replace('.', '_');
      
      const result = await apiClient.login(uid, email);
      setUser(result.user);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // For simplicity, use email as uid (in real app, would get from Firebase Auth)
      const uid = email.replace('@', '_').replace('.', '_');
      
      const result = await apiClient.register(uid, email);
      setUser(result.user);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await apiClient.logout();
      setUser(null);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout
  };
};