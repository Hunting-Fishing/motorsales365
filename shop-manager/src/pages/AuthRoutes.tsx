
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from '@/pages/Auth';

export default function AuthRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/signup" element={<Navigate to="/auth" replace />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
