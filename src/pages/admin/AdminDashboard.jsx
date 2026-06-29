import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Package, AlertTriangle, ShieldCheck } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [userRes, orderRes] = await Promise.all([
        axios.get('http://localhost:5010/admin/stats'),
        axios.get('http://localhost:5000/api/orders/admin/stats')
      ]);
      setStats({
         users: userRes.data,
         orders: orderRes.data
      });
    } catch (err) {
      console.error("Error fetching stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading platform insights...</div>;
  if (!stats) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Failed to load stats. Check backend connectivity.</div>;

  return (
    <div className="admin-page-container">
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Platform Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
             <Users size={20} /> <span style={{ fontWeight: 600 }}>Total Users</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.users.totalUsers}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{stats.users.drivers || 0} Drivers, {stats.users.verifiedDrivers || 0} Verified</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
             <Package size={20} /> <span style={{ fontWeight: 600 }}>Total Orders</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.orders.total}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{stats.orders.approved} Approved, {stats.orders.pending} Pending</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
             <AlertTriangle size={20} /> <span style={{ fontWeight: 600 }}>Active Reports</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.orders.reported}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Awaiting resolution</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
             <ShieldCheck size={20} /> <span style={{ fontWeight: 600 }}>Resolved</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.orders.resolved}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Disputes handled</p>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
