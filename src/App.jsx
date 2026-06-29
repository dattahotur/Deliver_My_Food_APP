import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import { Earnings, Profile } from './pages/Placeholders';
import Orders from './pages/Orders';
import Auth from './pages/Auth';
import VerificationPage from './pages/VerificationPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Preloader from './components/Preloader';

// Admin Components
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [initializing, setInitializing] = useState(true);

  if (initializing) {
    return <Preloader onFinish={() => setInitializing(false)} />;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Auth />} />
            
            {/* Driver Portal */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="earnings" element={<Earnings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="verify" element={<VerificationPage />} />
            </Route>
  
            {/* Admin Portal */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
  
            <Route path="*" element={<div className="flex justify-center p-4"><h1>Page Not Found</h1></div>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
