import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (/\s/.test(formData.password)) {
        setError('Password must not contain spaces.');
        setLoading(false);
        return;
      }
    }

    try {
      let userData;
      if (isLogin) {
        userData = await login(formData.email, formData.password);
      } else {
        userData = await register(formData.name || 'Delivery Partner', formData.email, formData.password);
      }
      
      addToast(isLogin ? 'Welcome back!' : 'Account created successfully!', 'success');
      
      if (userData?.role === 'admin') {
         navigate('/admin');
      } else {
         navigate('/');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      
      <div className="flex-col justify-center animate-fade-in" style={{ flex: 1, maxWidth: '400px', width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.05))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(16,185,129,0.15)',
            marginBottom: '1rem',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)'
          }}>
            <img src="/favicon.svg" alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem', marginTop: 0 }}>DeliverMyFood</h1>
          <p style={{ color: 'var(--text-muted)' }}>Deliver with pride. Earn with ease.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {isLogin ? 'Welcome Back!' : 'Create a Partner Account'}
          </h2>

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div className="flex-col gap-4" style={{ marginBottom: '1.5rem' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Full Name</label>
                <input type="text" name="name" className="input-field" placeholder="John Smith" onChange={handleChange} required />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Email Address</label>
              <input type="email" name="email" className="input-field" placeholder="partner@gmail.com" onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Password</label>
              <input type="password" name="password" className="input-field" placeholder="••••••••" onChange={handleChange} required minLength={4} />
            </div>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Confirm Password</label>
                <input type="password" name="confirmPassword" className="input-field" placeholder="••••••••" onChange={handleChange} required minLength={4} />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: '600', marginTop: '0.25rem', display: 'block' }}>
                    ✗ Passwords do not match
                  </span>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600', marginTop: '0.25rem', display: 'block' }}>
                    ✓ Passwords match
                  </span>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', color: 'var(--primary)', fontWeight: 600 }}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          By continuing, you agree to our <span style={{ color: 'var(--primary)' }}>Terms of Service</span> and <span style={{ color: 'var(--primary)' }}>Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
};

export default Auth;
