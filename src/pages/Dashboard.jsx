import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, IndianRupee, Truck, Zap, Bell, Clock, Package, ShieldAlert, Building, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [driverStats, setDriverStats] = useState({ 
    todaysEarnings: 0, 
    todaysTrips: 0, 
    totalTrips: 0, 
    availableBalance: 0 
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);

  // Direct Withdraw states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [bankDetails, setBankDetails] = useState({ account: '', ifsc: '' });
  const [upiId, setUpiId] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const [availableCount, setAvailableCount] = useState(0);
  const prevAvailableRef = useRef(0);

  useEffect(() => {
    if (user?.isOnline !== undefined) setIsOnline(user.isOnline);
  }, [user]);

  useEffect(() => {
    fetchActiveDelivery();
    // Poll for new orders every 15s
    const interval = setInterval(fetchActiveDelivery, 15000);
    return () => clearInterval(interval);
  }, [user, isOnline]);

  const toggleOnline = async () => {
    if (!user?.id) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      await axios.put(`https://deliver-user-service.onrender.com/${user.id}/online-status`, { isOnline: newStatus });
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to toggle online status', err);
      setIsOnline(!newStatus); // revert
    }
  };

  const handleDismissWarning = async () => {
    if (!user?.id) return;
    try {
      await axios.post(`https://deliver-user-service.onrender.com/${user.id}/clear-warnings`);
      addToast('Warning acknowledged & dismissed.', 'success');
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
      addToast('Failed to dismiss warning.', 'error');
    }
  };

  const fetchActiveDelivery = async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch active delivery from Delivery Service
      const activeRes = await axios.get(`https://api-gateway-g0a8.onrender.com/api/delivery/active/${user.id}`);
      setActiveDelivery(activeRes.data);

      // 2. Fetch available count from Delivery Service
      const availRes = await axios.get('https://api-gateway-g0a8.onrender.com/api/delivery/available');
      const available = availRes.data.length;

      if (available > prevAvailableRef.current && isOnline) {
        addToast(`🔔 ${available} new order${available > 1 ? 's' : ''} available!`, 'info');
      }
      prevAvailableRef.current = available;
      setAvailableCount(available);

      // 3. Fetch stats from Order Service (using optimized driver endpoint)
      const ordersRes = await axios.get(`https://api-gateway-g0a8.onrender.com/api/orders/driver/${user.id}`);
      const myCompleted = ordersRes.data.filter(o =>
        (o.deliveryStatus === 'delivered' || o.status === 'completed')
      );
      
      const todayStr = new Date().toDateString();
      const todaysCompleted = myCompleted.filter(o => {
        const orderDate = new Date(o.timestamp || o.createdAt);
        return orderDate.toDateString() === todayStr;
      });
      
      const todaysTrips = todaysCompleted.length;
      const todaysEarnings = todaysCompleted.reduce((sum, o) => sum + (Number(o.price) || 45.00), 0);
      const totalTrips = myCompleted.length;
      const lifetimeEarnings = myCompleted.reduce((sum, o) => sum + (Number(o.price) || 45.00), 0);

      // 4. Fetch latest user profile to get synchronized balance
      let availableBalance = 0;
      try {
        const userRes = await axios.get(`https://deliver-user-service.onrender.com/${user.id}`);
        availableBalance = userRes.data.availableEarnings || 0;
      } catch (err) {
        console.error("Failed to fetch user balance:", err);
      }

      setDriverStats({ 
        todaysEarnings, 
        todaysTrips, 
        totalTrips, 
        availableBalance 
      });

    } catch (err) {
      console.error("Failed to sync dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    
    if (!amount || amount <= 0) {
      return addToast('Please enter a valid amount', 'error');
    }
    if (amount > driverStats.availableBalance) {
      return addToast('Insufficient balance', 'error');
    }
    if (withdrawMethod === 'bank') {
      if (!bankDetails.account || !bankDetails.ifsc) {
        return addToast('Please enter complete bank details', 'error');
      }
      const accountRegex = /^\d{9,18}$/;
      if (!accountRegex.test(bankDetails.account)) {
        return addToast('Please enter a valid Account Number (9 to 18 digits)', 'error');
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
      if (!ifscRegex.test(bankDetails.ifsc)) {
        return addToast('Please enter a valid 11-character IFSC code (e.g. SBIN0012345)', 'error');
      }
    }
    if (withdrawMethod === 'upi') {
      if (!upiId) {
        return addToast('Please enter a valid UPI ID', 'error');
      }
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(upiId)) {
        return addToast('Please enter a valid UPI ID format (e.g. name@bank)', 'error');
      }
    }

    setIsWithdrawing(true);
    try {
      const details = withdrawMethod === 'bank' ? bankDetails : { upiId };
      const res = await axios.post(`https://deliver-user-service.onrender.com/${user.id}/withdraw`, {
        amount,
        method: withdrawMethod,
        details
      });

      const transId = res.data?.withdrawal?.id || 'WTH' + Math.floor(100000 + Math.random() * 900000);

      setIsWithdrawing(false);
      setShowWithdrawModal(false);

      setSuccessDetails({
        amount,
        transactionId: transId,
        method: withdrawMethod,
        details: withdrawMethod === 'bank' ? bankDetails : { upiId }
      });
      setShowSuccessModal(true);

      setWithdrawAmount('');
      setBankDetails({ account: '', ifsc: '' });
      setUpiId('');
      addToast('withdrawal placed successfully', 'success');
      
      // Refresh dashboard stats
      fetchActiveDelivery();
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to withdraw funds:', err);
      addToast(err.response?.data?.error || 'Withdrawal failed. Please try again.', 'error');
      setIsWithdrawing(false);
    }
  };

  const updateDeliveryStatus = async (status) => {
    if (!activeDelivery) return;
    try {
      // Update in delivery service (main source of truth for riders)
      await axios.put(`https://api-gateway-g0a8.onrender.com/api/delivery/${activeDelivery._id}/status`, {
        status
      });
      
      if (status === 'delivered') {
        addToast('🎉 Delivery completed! Earnings updated.', 'success');
      }
      fetchActiveDelivery();
    } catch (err) {
      console.error("Status Update Failed:", err.response?.data || err.message);
      addToast("Failed to update status. Please check your internet connection.", "error");
    }
  };

  return (
    <div className="flex-col gap-4 animate-fade-in" style={{ position: 'relative', zIndex: showWithdrawModal ? 110 : 'auto' }}>


      {/* Formal Warning Banner */}
      {user?.warnings && user.warnings.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '2px solid var(--danger)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1.25rem', 
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          animation: 'pulse-red 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)' }}>
            <ShieldAlert size={24} />
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>CRITICAL FORMAL WARNING</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>
            {user.warnings[user.warnings.length - 1].reason}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Sent by: {user.warnings[user.warnings.length - 1].adminName} on {new Date(user.warnings[user.warnings.length - 1].timestamp).toLocaleDateString()}
          </p>
          <button 
            onClick={handleDismissWarning} 
            style={{
              alignSelf: 'flex-end',
              backgroundColor: 'var(--danger)',
              color: 'white',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            Acknowledge & Dismiss
          </button>
        </div>
      )}

      {/* Offline Overlay Banner */}
      {!isOnline && (
        <div style={{
          backgroundColor: 'rgba(100, 116, 139, 0.08)', border: '2px dashed var(--text-muted)',
          borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(100,116,139,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto'
          }}>
            <Zap size={32} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            You are Offline
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Go online to start receiving delivery requests and earn money.
          </p>
          <button onClick={toggleOnline} className="btn btn-primary" style={{
            padding: '0.75rem 2rem', fontSize: '1rem', borderRadius: 'var(--radius-full)',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <Zap size={18} /> Go Online
          </button>
        </div>
      )}

      {/* Verification warning */}
      {user?.verificationStatus !== 'verified' && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid var(--warning)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
           <h4 style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Account Pending
           </h4>
           <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>Your account is under admin review. You cannot receive deliveries right now. Please upload documents in Profile.</p>
        </div>
      )}

      {/* Earnings Summary Card */}
      {isOnline && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Today's Earnings</p>
              <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', color: 'var(--success)', fontWeight: 700 }}>
                <IndianRupee size={24} />
                <span>{driverStats.todaysEarnings.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Trips Today</p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 700 }}>{driverStats.todaysTrips}</h3>
            </div>
          </div>
          
          <div className="responsive-card" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Available Balance</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', margin: 0, marginTop: '2px' }}>
                <IndianRupee size={16} />
                <span>{driverStats.availableBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
              </p>
            </div>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="btn btn-primary mobile-full"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
              disabled={driverStats.availableBalance <= 0}
            >
              Withdraw Funds
            </button>
          </div>
        </div>
      )}

      {/* Available Orders Alert */}
      {isOnline && availableCount > 0 && !activeDelivery && (
        <div onClick={() => navigate('/orders')} className="glass-card" style={{
          padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
          border: '1px solid rgba(16, 185, 129, 0.3)', backgroundColor: 'rgba(16, 185, 129, 0.05)',
          transition: 'transform 0.2s'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Package size={20} color="var(--success)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{availableCount} order{availableCount > 1 ? 's' : ''} available nearby</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tap to view and accept</p>
          </div>
          <Bell size={18} color="var(--success)" className="animate-pulse" />
        </div>
      )}

      {/* Active Order / Next Delivery */}
      {isOnline && (
        <>
          <h3 style={{ marginTop: '0.5rem', fontSize: '1.125rem' }}>Current Delivery</h3>

          {loading ? (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>Loading active delivery...</p>
            </div>
          ) : activeDelivery ? (
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <span style={{
                  backgroundColor: activeDelivery.status === 'waiting' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: activeDelivery.status === 'waiting' ? 'var(--warning)' : 'var(--primary)',
                  padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600
                }}>
                  {activeDelivery.status === 'waiting' ? 'En Route to Pickup' : 'En Route to Dropoff'}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>ID: {activeDelivery._id.slice(-6).toUpperCase()}</span>
              </div>

              {/* Simulated Map UI */}
              <div style={{
                height: '180px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)',
                backgroundSize: '20px 20px',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <path d={activeDelivery.status === 'waiting' ? "M30,150 C80,140 120,40 250,50" : "M30,150 C100,160 180,90 300,80"} stroke="var(--primary)" strokeWidth="4" strokeDasharray="8,8" fill="transparent" className="animate-pulse" />
                </svg>
                <div style={{ position: 'absolute', left: '20px', bottom: '20px', backgroundColor: 'var(--bg-base)', padding: '0.5rem', borderRadius: '50%', boxShadow: 'var(--shadow-md)' }}>
                  <Truck size={20} color="var(--primary)" />
                </div>
                <div style={{ position: 'absolute', right: activeDelivery.status === 'waiting' ? '80px' : '30px', top: activeDelivery.status === 'waiting' ? '30px' : '60px', backgroundColor: 'var(--bg-base)', padding: '0.5rem', borderRadius: '50%', boxShadow: 'var(--shadow-md)' }}>
                   {activeDelivery.status === 'waiting' ? <MapPin size={20} color="var(--warning)" /> : <Navigation size={20} color="var(--success)" />}
                </div>
              </div>

              {/* Delivery Timeline */}
              <div className="flex-col gap-4" style={{ position: 'relative', margin: '1rem 0' }}>
                <div className="flex items-center gap-4">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', zIndex: 2 }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600 }}>{activeDelivery.pickupAddress || `Sender #${activeDelivery.donorId}`}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pickup Location</p>
                  </div>
                </div>

                <div style={{ position: 'absolute', left: '15px', top: '32px', height: 'calc(100% - 32px)', width: '2px', backgroundColor: 'var(--border)', zIndex: 1 }}></div>

                <div className="flex items-center gap-4" style={{ marginTop: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', zIndex: 2 }}>
                    <Navigation size={18} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600 }}>{activeDelivery.userName || 'Customer'} {activeDelivery.dropoffPhone && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 400, marginLeft: '0.5rem' }}>📞 {activeDelivery.dropoffPhone}</span>}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeDelivery.dropoffAddress || 'Dropoff Location'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                {activeDelivery.status === 'waiting' ? (
                   <button onClick={() => updateDeliveryStatus('picked_up')} className="btn btn-primary btn-full flex items-center justify-center gap-2">
                     <Truck size={18} /> Order Picked Up
                   </button>
                ) : (
                   <button onClick={() => updateDeliveryStatus('delivered')} className="btn btn-primary btn-full flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--success)' }}>
                     <Navigation size={18} /> Complete Delivery
                   </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: 'var(--text-muted)' }}>
                 <Truck size={24} />
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No active deliveries right now.</p>
              <button onClick={() => navigate('/orders')} className="btn" style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                 Find Available Orders
              </button>
            </div>
          )}
        </>
      )}

      {/* Online Status Toggle */}
      <div className="glass-card" style={{ padding: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{isOnline ? 'Accepting Orders' : 'You are Offline'}</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {isOnline ? 'You will receive new delivery requests.' : 'Toggle to start receiving orders.'}
          </p>
        </div>
        <div onClick={toggleOnline} style={{ width: '48px', height: '24px', backgroundColor: isOnline ? 'var(--success)' : 'var(--text-muted)', borderRadius: 'var(--radius-full)', padding: '2px', cursor: 'pointer', transition: 'var(--transition-fast)' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', transform: isOnline ? 'translateX(24px)' : 'translateX(0)', transition: 'transform var(--transition-fast)' }}></div>
        </div>
      </div>

      {/* Quick Stats Row */}
      {isOnline && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem' }}>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <Clock size={18} color="var(--primary)" style={{ margin: '0 auto 0.25rem auto' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{driverStats.totalTrips > 0 ? `~${Math.max(15, 30 - driverStats.todaysTrips)} min` : 'N/A'}</p>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Avg. Delivery</p>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <Package size={18} color="var(--success)" style={{ margin: '0 auto 0.25rem auto' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{availableCount}</p>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Available</p>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <Navigation size={18} color="var(--warning)" style={{ margin: '0 auto 0.25rem auto' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{driverStats.totalTrips}</p>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Completed</p>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setShowWithdrawModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Withdraw Funds</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Available Balance: <strong>₹{driverStats.availableBalance.toFixed(2)}</strong>
            </p>

            <form onSubmit={handleWithdraw}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Amount to Withdraw (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-main)',
                    fontSize: '1rem'
                  }}
                />
                {Number(withdrawAmount) > driverStats.availableBalance && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>
                    ⚠️ Amount exceeds available balance!
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Withdrawal Method</label>
                <div className="flex-responsive-row">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bank')}
                    className={`btn ${withdrawMethod === 'bank' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >Bank Transfer</button>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('upi')}
                    className={`btn ${withdrawMethod === 'upi' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >UPI</button>
                </div>
              </div>

              {withdrawMethod === 'bank' && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <input
                      type="text"
                      required
                      pattern="\d{9,18}"
                      title="Please enter a valid account number (9 to 18 digits)"
                      value={bankDetails.account}
                      onChange={(e) => setBankDetails({...bankDetails, account: e.target.value})}
                      placeholder="Account Number"
                      style={{
                        width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-main)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      pattern="^[A-Za-z]{4}0[A-Za-z0-9]{6}$"
                      title="Please enter a valid 11-character IFSC code (e.g. SBIN0012345)"
                      value={bankDetails.ifsc}
                      onChange={(e) => setBankDetails({...bankDetails, ifsc: e.target.value})}
                      placeholder="IFSC Code"
                      style={{
                        width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-main)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {withdrawMethod === 'upi' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    required
                    pattern="^[\w\.\-]+@[\w\.\-]+$"
                    title="Please enter a valid UPI ID (e.g. name@bank)"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="Enter UPI ID (e.g. name@bank)"
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-main)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              )}

              <div className="flex-responsive-row" style={{ gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isWithdrawing}
                >
                  Cancel
                </button>
                 <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={isWithdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > driverStats.availableBalance}
                >
                  {isWithdrawing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '2rem', position: 'relative', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setShowSuccessModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            {/* Checkmark Animation Icon */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Withdrawal Successful!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Your payout request has been processed successfully.
            </p>

            <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-surface-elevated)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                <strong style={{ color: 'var(--success)' }}>₹{successDetails.amount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction ID</span>
                <span style={{ fontWeight: 600 }}>{successDetails.transactionId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Method</span>
                <span style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>
                  {successDetails.method === 'bank' 
                    ? `Bank Transfer (...${successDetails.details?.account?.slice(-4) || ''})` 
                    : `UPI (${successDetails.details?.upiId || ''})`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>COMPLETED</span>
              </div>
            </div>

            <button 
              className="btn btn-primary btn-full"
              onClick={() => setShowSuccessModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
