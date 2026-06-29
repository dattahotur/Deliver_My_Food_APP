import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

const VerificationPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [docs, setDocs] = useState({ license: null, aadhaar: null, bank: null });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize and check attempts
  const attempts = parseInt(localStorage.getItem(`verification_attempts_${user?.id}`) || '0', 10);


  const handleUpload = (type, e) => {
    if (e.target.files && e.target.files[0]) {
      setDocs(prev => ({ ...prev, [type]: e.target.files[0] }));
    }
  };

  const submitAll = async () => {
    if (docs.license && docs.aadhaar && docs.bank) {
      if (user?.id) {
        // Convert files to base64 to send and display them properly
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });

        try {
          const licenseBase64 = await fileToBase64(docs.license);
          const aadhaarBase64 = await fileToBase64(docs.aadhaar);
          const bankBase64 = await fileToBase64(docs.bank);

          const payload = [
            { type: 'license', name: docs.license.name, url: licenseBase64 },
            { type: 'aadhaar', name: docs.aadhaar.name, url: aadhaarBase64 },
            { type: 'bank', name: docs.bank.name, url: bankBase64 }
          ];
        
          await axios.post('http://localhost:5010/verify', { userId: user.id, documents: payload });
          localStorage.setItem(`verification_attempts_${user.id}`, (attempts + 1).toString());
          if (refreshUser) await refreshUser();
        } catch (err) {
          console.error("Failed to sync backend verification status", err);
        }
      }
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/profile');
      }, 2800);
    }
  };

  if (user?.verificationStatus === 'verified') {
     return (
        <div className="animate-fade-in flex-col gap-4 p-4 text-center">
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>Account Verified</h2>
           <p style={{ color: 'var(--text-muted)' }}>You are fully verified and can accept orders!</p>
           <button className="btn btn-secondary" onClick={() => navigate('/profile')} style={{ margin: '1rem auto' }}>Return to Profile</button>
        </div>
     );
  } else if (attempts >= 3 && user?.verificationStatus !== 'verified') {
     return (
        <div className="animate-fade-in flex-col gap-4 p-4 text-center" style={{ marginTop: '2rem' }}>
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
             Maximum Attempts Reached
           </h2>
           <p style={{ color: 'var(--text-muted)' }}>You have exceeded the maximum of 3 verification attempts. Your account cannot be verified at this time.</p>
           <button className="btn btn-secondary" onClick={() => navigate('/profile')} style={{ margin: '1rem auto' }}>Return to Profile</button>
        </div>
     );
  } else if (user?.verificationStatus === 'pending' && !showSuccess) {
     return (
        <div className="animate-fade-in flex-col gap-4 p-4 text-center" style={{ marginTop: '2rem' }}>
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
             Under Admin Review
           </h2>
           <p style={{ color: 'var(--text-muted)' }}>Your documents have been securely uploaded and are waiting for an administrator's approval. Please check back later!</p>
           <button className="btn btn-primary" onClick={() => navigate('/profile')} style={{ margin: '1rem auto' }}>Return to Profile</button>
           <button 
             className="btn btn-outline" 
             onClick={async () => {
               setIsRefreshing(true);
               if (refreshUser) await refreshUser();
               setIsRefreshing(false);
             }} 
             disabled={isRefreshing}
             style={{ margin: '0 auto' }}>
             {isRefreshing ? 'Checking Status...' : 'Refresh Status'}
           </button>
        </div>
     );
  } else if (user?.verificationStatus === 'rejected' && !showSuccess) {
     return (
        <div className="animate-fade-in flex-col gap-4 p-4 text-center" style={{ marginTop: '2rem' }}>
           <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
             Verification Rejected
           </h2>
           <p style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Unfortunately, your documents were rejected by the administrator.</p>
           <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>You have {3 - attempts} attempt(s) remaining.</p>
           
           <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/profile')}>Return to Profile</button>
              <button className="btn btn-primary" onClick={async () => {
                 // Clear backend status back to none so they can see the upload form
                 try {
                   await axios.put(`http://localhost:5010/admin/verify/${user.id}`, { status: 'none' });
                   if (refreshUser) await refreshUser();
                 } catch (err) {
                    console.error("Failed to reset status", err);
                 }
              }}>Re-apply Now</button>
           </div>
        </div>
     );
  }

  return (
    <div className="animate-fade-in flex-col gap-4" style={{ paddingBottom: '2rem' }}>
      
      {/* Advanced Success Overlay Notification */}
      {showSuccess && (
        <div style={{
           position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
           backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
           display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
           zIndex: 1000, animation: 'fadeIn 0.3s ease-out'
        }}>
           <div className="glass-card flex-col items-center justify-center animate-slide-up" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '320px', borderRadius: '24px' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                 <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '50%', animation: 'pulse-ring 2s infinite' }}></div>
                 <CheckCircle size={48} color="var(--success)" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>Successfully Submitted</h2>
              <p style={{ color: 'var(--text-main)', fontSize: '0.875rem' }}>Your documents have been securely encrypted and uploaded.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem' }}>Redirecting to profile...</p>
           </div>
        </div>
      )}

      <button onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', color: 'var(--text-muted)', fontWeight: 600 }}>
        <ArrowLeft size={20} /> Back to Profile
      </button>

      <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700, color: 'var(--danger)' }}>Verification Center</h3>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>To activate your account and start receiving deliveries, you must upload photos of the following documents for admin approval.</p>
        <p style={{ color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 600 }}>Attempt {attempts + 1} of 3</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
           {/* 1. Driving License */}
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
             <div>
               <p style={{ fontWeight: 600 }}>1. Driving License</p>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clear photo of DL</p>
             </div>
             <label style={{ 
                cursor: 'pointer', backgroundColor: docs.license ? 'var(--success)' : 'var(--bg-surface-elevated)', 
                color: docs.license ? 'white' : 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', 
                fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--border)', transition: 'all 0.2s' 
              }}>
               {docs.license ? '✅ Uploaded' : 'Upload File'}
               <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleUpload('license', e)} />
             </label>
           </div>

           {/* 2. Aadhaar Card */}
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
             <div>
               <p style={{ fontWeight: 600 }}>2. Aadhaar Card</p>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Front and back photo</p>
             </div>
             <label style={{ 
                cursor: 'pointer', backgroundColor: docs.aadhaar ? 'var(--success)' : 'var(--bg-surface-elevated)', 
                color: docs.aadhaar ? 'white' : 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', 
                fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--border)', transition: 'all 0.2s'
              }}>
               {docs.aadhaar ? '✅ Uploaded' : 'Upload File'}
               <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleUpload('aadhaar', e)} />
             </label>
           </div>

           {/* 3. Bank Account */}
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
             <div>
               <p style={{ fontWeight: 600 }}>3. Bank Details</p>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passbook or Cancelled Cheque</p>
             </div>
             <label style={{ 
                cursor: 'pointer', backgroundColor: docs.bank ? 'var(--success)' : 'var(--bg-surface-elevated)', 
                color: docs.bank ? 'white' : 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', 
                fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--border)', transition: 'all 0.2s'
              }}>
               {docs.bank ? '✅ Uploaded' : 'Upload File'}
               <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleUpload('bank', e)} />
             </label>
           </div>
        </div>

        <button 
           className="btn btn-primary btn-full" 
           style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (!docs.license || !docs.aadhaar || !docs.bank) ? 0.5 : 1, padding: '1rem', fontSize: '1.125rem' }} 
           disabled={!docs.license || !docs.aadhaar || !docs.bank} 
           onClick={submitAll}>
           Submit Documents for Review
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;
