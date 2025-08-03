import React, { useState } from 'react';
import { useAuthWorkers } from '../hooks/useAuthWorkers';

export const LoginFormWorkers: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register, loading, error } = useAuthWorkers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>{isRegistering ? 'ユーザー登録' : 'ログイン'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="例: user@example.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              placeholder="6文字以上"
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? '処理中...' : (isRegistering ? '登録' : 'ログイン')}
          </button>
        </form>
        
        <p>
          {isRegistering ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでない方は'}
          <button 
            type="button" 
            className="link-button"
            onClick={() => setIsRegistering(!isRegistering)}
            disabled={loading}
          >
            {isRegistering ? 'ログイン' : 'ユーザー登録'}
          </button>
        </p>
        
        <div className="info-note">
          <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
            ℹ️ Cloudflare Workers 版では、メールアドレスがユーザーIDとして使用されます
          </p>
        </div>
      </div>
    </div>
  );
};