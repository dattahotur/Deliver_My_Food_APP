import { useAuth } from '../context/AuthContext';
import { IndianRupee, TrendingUp, TrendingDown, Star, Award, Clock, ArrowRight, ShieldCheck, Minus, Building, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DELIVERY_FEE = 45.00; // Flat fee per completed delivery

// Get Mon–Sun of the current week
const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon,...
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun };
};

const formatDateRange = (mon, sun) => {
  const opts = { month: 'short', day: 'numeric' };
  return `${mon.toLocaleDateString('en-IN', opts)} – ${sun.toLocaleDateString('en-IN', opts)}`;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Earnings ──────────────────────────────────────────────────────────────────
export const Earnings = () => {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [weeklyAmounts, setWeeklyAmounts] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [payouts, setPayouts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Withdraw states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [bankDetails, setBankDetails] = useState({ account: '', ifsc: '' });
  const [upiId, setUpiId] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { mon, sun } = getCurrentWeekRange();
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [ordersRes, userRes] = await Promise.all([
        axios.get(`https://api-gateway-g0a8.onrender.com/api/orders/driver/${user.id}`),
        axios.get(`https://deliver-user-service.onrender.com/${user.id}`)
      ]);

      const myCompleted = ordersRes.data.filter(o =>
        (o.deliveryStatus === 'delivered' || o.status === 'completed')
      );

      // ── This-week earnings broken down by weekday ──────────────────────
      const dailyAmounts = [0, 0, 0, 0, 0, 0, 0]; // Mon–Sun
      let weekTotal = 0;
      const weekPayouts = [];

      myCompleted.forEach(o => {
        const ts = new Date(o.timestamp || o.createdAt);
        if (ts >= mon && ts <= sun) {
          const jsDay = ts.getDay();
          const idx = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0 ... Sun=6
          const fee = Number(o.price) || DELIVERY_FEE;
          dailyAmounts[idx] += fee;
          weekTotal += fee;
          weekPayouts.push({
            id: String(o._id).slice(-6).toUpperCase(),
            date: ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            amount: fee,
            status: 'Completed'
          });
        }
      });

      // Sort payouts newest first
      weekPayouts.sort((a, b) => b.date.localeCompare(a.date));

      const lifeEarnings = myCompleted.reduce((sum, o) => sum + (Number(o.price) || DELIVERY_FEE), 0);

      setWeeklyAmounts(dailyAmounts);
      setTotalEarnings(weekTotal);
      setLifetimeEarnings(lifeEarnings);
      setPayouts(weekPayouts);
      
      const userObj = userRes.data;
      const sortedWithdrawals = (userObj.withdrawals || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setWithdrawals(sortedWithdrawals);
      setAvailableBalance(userObj.availableEarnings || 0);
    } catch (err) {
      console.error('Earnings fetch error:', err);
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
    if (amount > availableBalance) {
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
      
      fetchData();
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to withdraw funds:', err);
      addToast(err.response?.data?.error || 'Withdrawal failed. Please try again.', 'error');
      setIsWithdrawing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const maxAmount = Math.max(...weeklyAmounts, 1);

  return (
    <div className="animate-fade-in flex-col gap-6" style={{ paddingBottom: '2rem', position: 'relative', zIndex: (showWithdrawModal || showSuccessModal) ? 110 : 'auto' }}>
      {/* Header */}
      <div className="responsive-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Earnings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {formatDateRange(mon, sun)} (This Week)
          </p>
        </div>
        <div className="responsive-header-right">
          <h3 style={{ fontSize: '2rem', color: 'var(--success)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <IndianRupee size={28} />
            {loading ? '—' : availableBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {totalEarnings > 0
              ? <><TrendingUp size={12} color="var(--primary)" /> {payouts.length} deliveries this week</>
              : <><Minus size={12} /> No earnings this week</>
            }
          </p>
          <button 
            className="btn btn-primary mt-2 mobile-full" 
            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setShowWithdrawModal(true)}
            disabled={loading || availableBalance <= 0}
          >
            <Building size={16} /> Withdraw Funds
          </button>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div className="glass-card" style={{ padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          {weeklyAmounts.map((amt, i) => {
            const heightPct = maxAmount > 0 ? `${(amt / maxAmount) * 100}%` : '0%';
            const isToday = (() => {
              const jsDay = new Date().getDay();
              const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
              return i === todayIdx;
            })();
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%', height: '100%', position: 'relative' }}>
                {amt > 0 && (
                  <span style={{ position: 'absolute', bottom: `calc(${heightPct} + 4px)`, fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    ₹{amt.toFixed(0)}
                  </span>
                )}
                <div style={{
                  width: '100%',
                  backgroundColor: amt > 0
                    ? (isToday ? 'var(--primary)' : 'rgba(16,185,129,0.35)')
                    : 'rgba(100,116,139,0.1)',
                  height: amt > 0 ? heightPct : '4px',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '4px',
                  marginTop: 'auto',
                  transition: 'height 0.8s ease-out'
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {DAY_LABELS.map((d, i) => {
            const jsDay = new Date().getDay();
            const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
            return (
              <span key={i} style={{
                width: '12%', textAlign: 'center', fontSize: '0.75rem',
                color: i === todayIdx ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: i === todayIdx ? 700 : 400
              }}>
                {d}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Recent Deliveries */}
        <div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: 600 }}>Deliveries This Week</h3>
          <div className="flex-col gap-3">
            {loading ? (
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : payouts.length > 0 ? payouts.map((p, i) => (
              <div key={i} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Order #{p.id}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700 }}>₹{p.amount.toFixed(2)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{p.status}</p>
                </div>
              </div>
            )) : (
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No deliveries completed this week
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal Transactions History */}
        <div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: 600 }}>Withdrawal History</h3>
          <div className="flex-col gap-3">
            {loading ? (
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : withdrawals.length > 0 ? withdrawals.map((w, i) => (
              <div key={i} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Withdrawal #{w.id.slice(-6).toUpperCase()}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(w.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Method: <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{w.method}</span> 
                    {w.method === 'bank' ? ` (A/C: ...${w.details.account.slice(-4)})` : ` (${w.details.upiId})`}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: 'var(--danger)' }}>- ₹{w.amount.toFixed(2)}</p>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '2px 8px', 
                    borderRadius: 'var(--radius-full)', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    color: 'var(--success)',
                    fontWeight: 600
                  }}>
                    {w.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )) : (
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No withdrawals on record
              </div>
            )}
          </div>
        </div>

      </div>

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
              Available Balance: <strong>₹{availableBalance.toFixed(2)}</strong>
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
                {Number(withdrawAmount) > availableBalance && (
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
                  disabled={isWithdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > availableBalance}
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


// ── Profile ───────────────────────────────────────────────────────────────────
export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P';

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [stats, setStats] = useState({
    trips: 0,
    rating: null,   // null = no ratings yet
    ratingCount: 0,
    totalOrders: 0, // total orders assigned (for acceptance rate)
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchStats = async () => {
      try {
        // Fetch all orders assigned to this driver
        const [ordersRes, userRes] = await Promise.all([
          axios.get(`https://api-gateway-g0a8.onrender.com/api/orders/driver/${user.id}`),
          axios.get(`https://deliver-user-service.onrender.com/${user.id}`)
        ]);

        const allDriverOrders = ordersRes.data;
        const myCompleted = allDriverOrders.filter(o =>
          o.deliveryStatus === 'delivered' || o.status === 'completed'
        );

        const u = userRes.data;
        const ratings = u.ratings || [];
        const totalRating = ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
        const count = ratings.length;
        const avgRating = count > 0 ? (totalRating / count) : null;

        setStats({
          trips: myCompleted.length,
          rating: avgRating,
          ratingCount: count,
          totalOrders: allDriverOrders.length,
        });
      } catch (err) {
        console.error('Profile stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const acceptanceRate = stats.totalOrders > 0
    ? Math.round((stats.trips / stats.totalOrders) * 100)
    : null;

  const handlePhotoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePhoto(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div className="animate-fade-in flex-col gap-6" style={{ paddingBottom: '2rem' }}>

      {/* Profile Header */}
      <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
        <button onClick={logout} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600 }}>Log Out</button>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', boxShadow: 'var(--shadow-md)', cursor: 'pointer', overflow: 'hidden' }}>
          <label style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profilePhoto
              ? <img src={profilePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
              : <span style={{ fontSize: '2rem', fontWeight: 700 }}>{initials}</span>}
            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user?.name || 'Partner'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{user?.email}</p>

        {user?.verificationStatus === 'verified' ? (
          <span style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} /> Verified Partner
          </span>
        ) : user?.verificationStatus === 'pending' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>Under Admin Review</span>
            <button className="btn btn-outline" style={{ padding: '0.25rem 1rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-full)' }} onClick={() => navigate('/verify')}>Check Status</button>
          </div>
        ) : user?.verificationStatus === 'rejected' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>Verification Rejected</span>
            <button className="btn btn-primary" style={{ padding: '0.25rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: 'var(--radius-full)' }} onClick={() => navigate('/verify')}>Re-submit</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>Unverified Account</span>
            <button className="btn btn-primary" style={{ padding: '0.25rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: 'var(--radius-full)' }} onClick={() => navigate('/verify')}>Verify Now</button>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: 600 }}>Performance Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>

          {/* Rating */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--warning)' }}>
              <Star size={18} fill={stats.rating !== null ? 'currentColor' : 'none'} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Rating</span>
            </div>
            {loading ? (
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>—</p>
            ) : stats.rating !== null ? (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.rating.toFixed(1)}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on {stats.ratingCount} review{stats.ratingCount !== 1 ? 's' : ''}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>—</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No ratings yet</p>
              </>
            )}
          </div>

          {/* Acceptance Rate */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <Award size={18} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Completion</span>
            </div>
            {loading ? (
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>—</p>
            ) : acceptanceRate !== null ? (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{acceptanceRate}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stats.trips}/{stats.totalOrders} orders completed
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>—</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No orders yet</p>
              </>
            )}
          </div>

          {/* Reports */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--danger)' }}>
              <Clock size={18} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Reports</span>
            </div>
            {loading ? (
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>—</p>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {user?.reportCount || 0}
                </p>
                <p style={{ fontSize: '0.75rem', color: (user?.reportCount || 0) === 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(user?.reportCount || 0) === 0 ? 'No issues reported' : 'Issue(s) on record'}
                </p>
              </>
            )}
          </div>

          {/* Total Trips */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--success)' }}>
              <ShieldCheck size={18} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Total Trips</span>
            </div>
            {loading ? (
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>—</p>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.trips}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Since joining</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: 600 }}>Account & Settings</h3>
        <div className="glass-card flex-col">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontWeight: 500 }}>Bank & Payouts</span> <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => navigate('/verify')}>
            <span style={{ fontWeight: 500 }}>Documents & Vehicles</span> <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontWeight: 500 }}>Help & Contact Support</span> <ArrowRight size={18} color="var(--text-muted)" />
          </div>
        </div>
      </div>

    </div>
  );
};
