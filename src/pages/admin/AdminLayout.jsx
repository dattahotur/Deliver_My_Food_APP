import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard, Users, AlertTriangle, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
  const vRes = await axios.get('https://deliver-user-service.onrender.com/admin/verifications');
  setPendingCount(vRes.data.length);

  const rRes = await axios.get('https://deliver-user-service.onrender.com/admin/all-reports');
  setReportCount(rRes.data.length);
} catch (err) {
  console.error('Failed to fetch admin stats:', err);
}
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-container">
      {/* Mobile Top Bar */}
      <header className="admin-mobile-header">
        <button 
          onClick={() => setIsMenuOpen(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem' }}
        >
          <Menu size={24} />
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Admin Portal</h2>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
          AD
        </div>
      </header>

      {/* Overlay backdrop for mobile */}
      <div 
        className={`admin-sidebar-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Sidebar Drawer */}
      <aside className={`admin-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Admin Portal</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--success)', marginTop: '0.25rem', margin: 0 }}>Platform Control</p>
          </div>
          {/* Close button inside drawer for mobile */}
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="admin-sidebar-close"
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/admin" end
            onClick={() => setIsMenuOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-main)',
              fontWeight: isActive ? 600 : 500
            })}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/admin/users"
            onClick={() => setIsMenuOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-main)',
              fontWeight: isActive ? 600 : 500
            })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <Users size={20} /> User Management
            </div>
            {pendingCount > 0 && (
               <span style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, animation: 'pulse-ring 2s infinite' }}>
                  {pendingCount}
               </span>
            )}
          </NavLink>
          <NavLink to="/admin/reports"
            onClick={() => setIsMenuOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-main)',
              fontWeight: isActive ? 600 : 500
            })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} /> Reported Orders
            </div>
            {reportCount > 0 && (
               <span style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {reportCount}
               </span>
            )}
          </NavLink>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>AD</span>
             </div>
             <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</p>
             </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '0.5rem', color: 'var(--danger)', fontWeight: 600, background: 'none' }}>
             <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
         <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
