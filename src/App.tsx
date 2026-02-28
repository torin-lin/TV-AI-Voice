import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import VersionRecordsPage from './features/versionRecords/components/VersionRecordsPage';
import CustomerProblemsPage from './features/customerProblems/components/CustomerProblemsPage';
import RecommendationsPage from './features/recommendations/components/RecommendationsPage';
import VoiceRecordsPage from './pages/VoiceRecordsPage';
import SettingsPage from './pages/SettingsPage';

/**
 * 主应用组件
 */
const App: React.FC = () => {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/version-records" element={<VersionRecordsPage />} />
          <Route path="/customer-problems" element={<CustomerProblemsPage />} />
          <Route path="/voice-records" element={<VoiceRecordsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
};

export default App;
