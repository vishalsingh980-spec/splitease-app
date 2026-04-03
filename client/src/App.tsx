import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Groups from './components/Groups';
import Expenses from './components/Expenses';
import Settlements from './components/Settlements';
import Navbar from './components/Navbar';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const AppRoutes: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      {/* Redirect old /register to /login — registration is handled via OTP */}
      <Route path="/register" element={<Navigate to="/login" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <Groups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settlements"
        element={
          <ProtectedRoute>
            <Settlements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
