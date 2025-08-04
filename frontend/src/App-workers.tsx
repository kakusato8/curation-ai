import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthWorkers } from './hooks/useAuthWorkers';
import { LoginFormWorkers } from './components/LoginFormWorkers';
import { DashboardWorkers } from './pages/DashboardWorkers';
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
            element={user ? <Navigate to="/" replace /> : <LoginFormWorkers />} 
          />
          <Route 
            path="/" 
            element={user ? <DashboardWorkers /> : <LoginFormWorkers />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default AppWorkers;