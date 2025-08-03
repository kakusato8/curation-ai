import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthWorkers } from './hooks/useAuthWorkers';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './pages/Dashboard';
import './App.css';

const AppWorkers: React.FC = () => {
  const { user, loading } = useAuthWorkers();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <LoginForm />} 
          />
          <Route 
            path="/" 
            element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default AppWorkers;