import { useState, useEffect } from 'react';
import axios from 'axios';
import { Inbox, ShieldAlert, Star, Loader2, AlertTriangle, UserX, RotateCcw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminReports = () => {
  const { addToast } = useToast();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'warned', 'restricted'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reportsRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5010/admin/all-reports'),
        axios.get('http://localhost:5010/admin/all')
      ]);
      setReports(reportsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch admin report details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (report, type) => {
    const reportId = report.orderId || report.id;
    setActionId(`${reportId}-${type}`);
    
    try {
      if (type === 'restrict') {
        await axios.delete(`http://localhost:5010/${report.targetUserId}`);
        addToast(`Account for ${report.targetUserName} restricted.`, 'error');
      } else {
        await axios.post('http://localhost:5010/warn-rider', {
          targetUserId: report.targetUserId,
          reason: report.feedback,
          adminName: "Platform Admin",
          orderId: report.orderId
        });
        addToast(`Formal warning sent to ${report.targetUserName}.`, 'success');
      }
      fetchData(); // Refresh the lists so the issue disappears and moves to the correct section
    } catch (err) {
      console.error("Action failed:", err);
      addToast("Failed to process action. Please try again.", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleRestore = async (userId, name) => {
    try {
      await axios.put(`http://localhost:5010/${userId}/restore`);
      addToast(`Account for ${name} restored successfully.`, 'success');
      fetchData();
    } catch (err) {
      console.error("Restore failed:", err);
      addToast("Failed to restore account.", "error");
    }
  };

  // Filter riders for lists
  const warnedRiders = users.filter(u => u.role === 'delivery-partner' && u.warnings && u.warnings.length > 0 && u.status !== 'deleted');
  const restrictedRiders = users.filter(u => u.role === 'delivery-partner' && u.status === 'deleted');

  return (
    <div className="admin-page-container">
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Rider Performance Issues</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Review reports and critical issues raised by donors and buyers regarding delivery partners.</p>
      
      {/* Tabs subnavigation */}
      <div className="admin-tab-nav">
        {[
          { id: 'active', label: 'Active Reports', count: reports.length, color: 'var(--danger)', icon: <ShieldAlert size={18} /> },
          { id: 'warned', label: 'Formal Warnings', count: warnedRiders.length, color: 'var(--warning)', icon: <AlertTriangle size={18} /> },
          { id: 'restricted', label: 'Restricted Accounts', count: restrictedRiders.length, color: 'var(--text-muted)', icon: <UserX size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''} tab-${tab.id}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span style={{
                backgroundColor: tab.id === 'active' ? 'rgba(239, 68, 68, 0.1)' : tab.id === 'warned' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                color: tab.id === 'active' ? 'var(--danger)' : tab.id === 'warned' ? 'var(--warning)' : 'var(--text-muted)',
                borderRadius: '9999px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary)" />
        </div>
      ) : activeTab === 'active' ? (
        reports.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Inbox size={48} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)' }}>No active rider reports to review.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reports.map((report, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                <div className="report-header-flex" style={{ marginBottom: '1rem' }}>
                   <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <ShieldAlert size={20} color="var(--danger)" />
                         Rider: {report.targetUserName}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Reported by: <b>{report.fromName}</b> on {new Date(report.timestamp).toLocaleString()}
                      </p>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--warning)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.875rem', alignSelf: 'flex-start' }}>
                      <Star size={14} fill="white" /> {report.rating}
                   </div>
                </div>
                
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                   <p style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>Issue Description:</p>
                   <p style={{ color: 'var(--text-main)' }}>{report.feedback || "No detailed comment provided."}</p>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Order Reference: #{report.orderId?.slice(-6)}</p>
                </div>
  
                <div className="report-actions-flex">
                  <button 
                    disabled={actionId !== null}
                    onClick={() => handleAction(report, 'restrict')}
                    className="btn" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {actionId === `${(report.orderId || report.id)}-restrict` ? <Loader2 size={16} className="animate-spin" /> : null}
                    Restrict Account
                  </button>
                  <button 
                    disabled={actionId !== null}
                    onClick={() => handleAction(report, 'warning')}
                    className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {actionId === `${(report.orderId || report.id)}-warning` ? <Loader2 size={16} className="animate-spin" /> : null}
                    Send Formal Warning
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'warned' ? (
        warnedRiders.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Inbox size={48} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)' }}>No warned rider accounts.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {warnedRiders.map((rider, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rider: {rider.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email: {rider.email}</p>
                  </div>
                  <span style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: 'var(--warning)',
                    padding: '0.25rem 0.60rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {rider.warnings.length} Warning(s)
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {rider.warnings.map((warn, wIdx) => (
                    <div key={wIdx} style={{ backgroundColor: 'rgba(245, 158, 11, 0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}><b>Reason:</b> {warn.reason}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Issued by {warn.adminName} on {new Date(warn.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        restrictedRiders.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Inbox size={48} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)' }}>No restricted rider accounts.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {restrictedRiders.map((rider, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserX size={20} color="var(--text-muted)" />
                      Rider: {rider.name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email: {rider.email}</p>
                    {rider.reports && rider.reports.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                        Accumulated {rider.reports.length} report(s) before restriction.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(rider.id, rider.name)}
                    className="btn btn-outline"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--success)',
                      borderColor: 'rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <RotateCcw size={16} />
                    Restore Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminReports;
