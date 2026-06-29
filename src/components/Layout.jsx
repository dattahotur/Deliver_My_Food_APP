import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, ListOrdered, DollarSign, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useState, useEffect } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '70px' }}>
      {/* Top Navbar */}
      <header className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.05))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(16,185,129,0.12)',
            overflow: 'hidden'
          }}>
            <img src="/favicon.svg" alt="Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 700 }}>DeliverMyFood</h2>
        </div>
        <div className="flex items-center gap-4" style={{ position: 'relative' }}>

          <div className="flex items-center gap-2 bg-surface-elevated" style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>Online<span className="hide-mobile"> ({user?.name?.split(' ')[0] || 'Partner'})</span></span>
            <div className="status-indicator"></div>
          </div>

          <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--danger)', display: 'flex', marginLeft: '0.25rem', border: 'none', cursor: 'pointer' }}>
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ paddingTop: '70px', paddingBottom: '20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="glass" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <NavItem to="/" icon={<Home size={24} />} label="Home" exact />
        <NavItem to="/orders" icon={<ListOrdered size={24} />} label="Orders" />
        <NavItem to="/earnings" icon={<DollarSign size={24} />} label="Earnings" />
        <NavItem to="/profile" icon={<User size={24} />} label="Profile" />
      </nav>
    </div>
  );
};

const NavItem = ({ to, icon, label, exact }) => {
  return (
    <NavLink 
      to={to} 
      end={exact}
      style={({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        fontSize: '0.75rem',
        fontWeight: isActive ? 600 : 400,
        transition: 'color var(--transition-fast)'
      })}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

export default Layout;
