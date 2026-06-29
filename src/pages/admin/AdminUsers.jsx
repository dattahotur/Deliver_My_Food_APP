import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, FileText, ExternalLink, ShieldCheck, Trash2, Users, UserCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminUsers = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  
  // All Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deleteUserObj, setDeleteUserObj] = useState(null);

  // Verification state
  const [requests, setRequests] = useState([]);
  const [verifyLoading, setVerifyLoading] = useState(true);
  const [reviewUser, setReviewUser] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchRequests();
  }, []);

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (reviewUser || fullscreenImage || confirmDeleteUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [reviewUser, fullscreenImage, confirmDeleteUser]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('https://deliver-user-service.onrender.com');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get('https://deliver-user-service.onrender.com/admin/verifications');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Delete User ────────────────────────────────────────────────
  const openDeleteModal = (user) => {
    setDeleteUserObj(user);
    setConfirmDeleteUser(user.id);
  };

  const executeDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await axios.delete(`https://deliver-user-service.onrender.com/${confirmDeleteUser}`);
      setUsers(prev => prev.filter(u => (u.id || u._id) !== confirmDeleteUser));
      addToast('User account deleted successfully.', 'success');
    } catch {
      addToast('Failed to delete user.', 'error');
    } finally {
      setConfirmDeleteUser(null);
      setDeleteUserObj(null);
    }
  };

  // ── Verification ───────────────────────────────────────────────
  const openReviewModal = (req) => {
    const docStatuses = {};
    if (req.verificationDocs) {
      req.verificationDocs.forEach(d => { docStatuses[d.type] = 'pending'; });
    }
    setReviewUser({ ...req, docStatuses });
  };

  const setDocStatus = (type, status) => {
    setReviewUser(prev => ({ ...prev, docStatuses: { ...prev.docStatuses, [type]: status } }));
  };

  const handleFinalize = async (status) => {
    try {
      await axios.put(`https://deliver-user-service.onrender.com/admin/verify/${reviewUser.id}`, { status });
      setRequests(requests.filter(req => req.id !== reviewUser.id));
      setReviewUser(null);
      addToast(status === 'verified' ? 'User verified successfully!' : 'Verification rejected.', status === 'verified' ? 'success' : 'info');
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const allApproved = reviewUser && Object.values(reviewUser.docStatuses || {}).every(s => s === 'approved');

  // ── Role badge style ───────────────────────────────────────────
  const getRoleBadge = (role) => {
    const styles = {
      admin:   { background: 'rgba(37,99,235,0.12)',   color: '#2563eb'  },
      driver:  { background: 'rgba(16,185,129,0.12)',  color: '#059669'  },
      ngo:     { background: 'rgba(124,58,237,0.12)',  color: '#7c3aed'  },
      default: { background: 'rgba(100,116,139,0.12)', color: '#475569'  },
    };
    return styles[role] || styles.default;
  };

  const getVerificationBadge = (status) => {
    const map = {
      verified: { label: '✓ Verified',   color: '#059669', bg: 'rgba(16,185,129,0.10)' },
      pending:  { label: '⏳ Pending',    color: '#d97706', bg: 'rgba(245,158,11,0.10)' },
      rejected: { label: '✕ Rejected',   color: '#dc2626', bg: 'rgba(239,68,68,0.10)'  },
      none:     { label: '— Not Applied', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
    };
    return map[status] || map.none;
  };

  return (
    <div className="admin-page-container" style={{ position: 'relative' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>User Management</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          View all registered users, manage accounts, and review verification requests.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {[
          { key: 'all', label: 'All Users', icon: <Users size={16} />, count: users.length },
          { key: 'verify', label: 'Verification Requests', icon: <UserCheck size={16} />, count: requests.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', fontFamily: 'inherit',
              backgroundColor: 'transparent', position: 'relative',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                backgroundColor: tab.key === 'verify' ? 'var(--danger)' : 'var(--primary)',
                color: 'white', padding: '1px 7px', borderRadius: '12px',
                fontSize: '0.72rem', fontWeight: 700,
                animation: tab.key === 'verify' && tab.count > 0 ? 'pulse-ring 2s infinite' : 'none',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ALL USERS TAB ─────────────────────────────────────── */}
      {activeTab === 'all' && (
        <>
          {usersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="loader" />
            </div>
          ) : users.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No users found.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
                    {['Name', 'Email', 'Role', 'Verification Status', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 700,
                        fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.5px', borderBottom: '1px solid var(--border)'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const roleBadge = getRoleBadge(u.role);
                    const verBadge  = getVerificationBadge(u.verificationStatus || 'none');
                    return (
                      <tr
                        key={u.id || u._id || i}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #059669))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                            }}>
                              {(u.name || 'U')[0].toUpperCase()}
                            </div>
                            {u.name}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <span style={{
                            ...roleBadge, padding: '0.2rem 0.65rem', borderRadius: '999px',
                            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <span style={{
                            backgroundColor: verBadge.bg, color: verBadge.color,
                            padding: '0.2rem 0.65rem', borderRadius: '999px',
                            fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {verBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => openDeleteModal(u)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--danger)', backgroundColor: 'rgba(239,68,68,0.06)',
                                color: 'var(--danger)', fontWeight: 700, fontSize: '0.8rem',
                                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = 'var(--danger)'; }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── VERIFICATION TAB ──────────────────────────────────── */}
      {activeTab === 'verify' && (
        <>
          {verifyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="loader" />
            </div>
          ) : requests.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <ShieldCheck size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No pending verification requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.map(req => (
                <div key={req.id} className="glass-card list-item-row" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), #047857)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0
                    }}>
                      {(req.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{req.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.15rem 0 0' }}>
                        {req.email} &bull; ID: {req.id} &bull;
                        <span style={{ marginLeft: '6px', color: 'var(--warning)', fontWeight: 600 }}>
                          {req.verificationDocs?.length || 0} document{(req.verificationDocs?.length || 0) !== 1 ? 's' : ''} uploaded
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openReviewModal(req)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      backgroundColor: 'var(--info)', color: 'white',
                      padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
                      fontWeight: 600, border: 'none', cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)', fontFamily: 'inherit'
                    }}
                  >
                    <FileText size={18} /> Review Documents
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FULLSCREEN IMAGE LIGHTBOX ─────────────────────────── */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <button style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={36} />
          </button>
          <img
            src={fullscreenImage} alt="Fullscreen Document"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}

      {/* ── REVIEW VERIFICATION MODAL ─────────────────────────── */}
      {reviewUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-card animate-slide-up review-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Reviewing: {reviewUser.name}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{reviewUser.email} • ID: {reviewUser.id}</p>
              </div>
              <button onClick={() => setReviewUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {(reviewUser.verificationDocs || []).map((doc, idx) => (
                <div key={idx} className="document-item-flex">
                  {/* Document Preview */}
                  <div
                    onClick={() => setFullscreenImage(doc.url)}
                    style={{
                      flex: '1', maxWidth: '200px', height: '140px',
                      backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px',
                      overflow: 'hidden', position: 'relative', border: '1px solid var(--border)', cursor: 'zoom-in'
                    }}
                  >
                    <img src={doc.url} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div
                      style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <ExternalLink size={16} /> View Fullscreen
                      </span>
                    </div>
                  </div>

                  <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, textTransform: 'capitalize', margin: 0 }}>{doc.type}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Filename: {doc.name}</p>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '1rem' }}>
                      <button
                        onClick={() => setDocStatus(doc.type, 'approved')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          backgroundColor: reviewUser.docStatuses[doc.type] === 'approved' ? 'var(--success)' : 'transparent',
                          color: reviewUser.docStatuses[doc.type] === 'approved' ? 'white' : 'var(--text-main)',
                          border: `1px solid ${reviewUser.docStatuses[doc.type] === 'approved' ? 'transparent' : 'var(--border)'}`,
                          padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={() => setDocStatus(doc.type, 'rejected')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          backgroundColor: reviewUser.docStatuses[doc.type] === 'rejected' ? 'var(--danger)' : 'transparent',
                          color: reviewUser.docStatuses[doc.type] === 'rejected' ? 'white' : 'var(--text-main)',
                          border: `1px solid ${reviewUser.docStatuses[doc.type] === 'rejected' ? 'transparent' : 'var(--border)'}`,
                          padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(!reviewUser.verificationDocs || reviewUser.verificationDocs.length === 0) && (
                <p style={{ color: 'var(--danger)', fontStyle: 'italic' }}>Warning: No documents were attached to this request!</p>
              )}
            </div>

            <div className="flex-responsive-row" style={{ gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => handleFinalize('rejected')} className="btn btn-outline mobile-full" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Reject Final Application
              </button>
              <button
                onClick={() => handleFinalize('verified')}
                disabled={!allApproved}
                className="btn btn-primary mobile-full"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: allApproved ? 1 : 0.5 }}
              >
                <ShieldCheck size={20} /> Verify & Activate User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE USER MODAL ─────────────────────────── */}
      {confirmDeleteUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card animate-slide-up" style={{ maxWidth: '420px', width: '90%', textAlign: 'center', padding: '2.5rem' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
            }}>
              <Trash2 size={28} color="var(--danger)" />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
              Delete Account
            </h2>
            {deleteUserObj && (
              <p style={{ color: 'var(--text-muted)', margin: '0 0 0.25rem', fontWeight: 600 }}>
                {deleteUserObj.name}
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', margin: '0 0 2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this user account? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setConfirmDeleteUser(null); setDeleteUserObj(null); }}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteUser}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 6px 16px -3px rgba(239,68,68,0.35)'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
