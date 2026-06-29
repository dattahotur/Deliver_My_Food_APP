import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/delivery/available');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/delivery/${id}/accept-delivery`, {
        driverId: user?.id,
        driverName: user?.name
      });
      setOrders(orders.filter(o => o._id !== id));
      addToast('Order accepted! Head to the pickup location.', 'success');
    } catch {
      addToast('Failed to accept order.', 'error');
    }
  };

  if (user?.verificationStatus !== 'verified') {
     return (
       <div className="animate-fade-in flex-col gap-4">
         <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Available Deliveries</h2>
         <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Package size={32} />
               <div style={{ position: 'absolute', transform: 'translate(15px, 15px)', backgroundColor: 'var(--bg-base)', borderRadius: '50%', padding: '2px' }}>
                  <CheckCircle size={16} color="var(--danger)" />
               </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Account Verification Required</h3>
            <p style={{ color: 'var(--text-muted)' }}>You must be verified by an administrator before you can view or accept live orders.</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>Head to your Profile to submit your documents!</p>
         </div>
       </div>
     );
  }

  return (
    <div className="animate-fade-in flex-col gap-4">
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Available Deliveries</h2>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading data...</div>
      ) : orders.length === 0 ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, display: 'block' }} />
          <p>No new delivery requests right now.</p>
        </div>
      ) : (
        <div className="flex-col gap-4">
          {orders.map(order => (
            <div key={order._id} className="glass-card animate-slide-up" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Order #{order._id.substring(0, 6)}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Payment: {order.paymentMethod}</span>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>Pickup: {order.pickupAddress || `Donor #${order.donorId}`}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Dropoff: {order.dropoffAddress || order.userName} {order.dropoffPhone && `(${order.dropoffPhone})`}</p>
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '2px 8px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', fontSize: '0.875rem' }}>Qty: {order.quantity}</span>
                    <h3 style={{ fontSize: '1.125rem', color: 'var(--success)' }}>Earnings: ₹45.00</h3>
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={() => acceptOrder(order._id)}>
                <CheckCircle size={18} /> Accept Delivery
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
