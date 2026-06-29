import React, { useState, useEffect } from 'react';

const Preloader = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 600);
    }, 2800);

    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000,
      transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(1.05)',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes orbFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.1); } }
        @keyframes orbFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-40px,30px) scale(1.15); } }
        @keyframes orbFloat3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,35px) scale(1.08); } }
        @keyframes logoReveal { 0% { transform: scale(0.6) rotate(-10deg); opacity: 0; filter: blur(10px); } 100% { transform: scale(1) rotate(0); opacity: 1; filter: blur(0); } }
        @keyframes textSlide { from { transform: translateY(40px); opacity: 0; filter: blur(6px); } to { transform: translateY(0); opacity: 1; filter: blur(0); } }
        @keyframes barProgress { 0% { width: 0%; } 100% { width: ${Math.min(progress, 100)}%; } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(16,185,129,0.3); } 50% { box-shadow: 0 0 40px rgba(16,185,129,0.6), 0 0 80px rgba(6,182,212,0.3); } }
      `}</style>

      {/* Animated gradient orbs */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', top: '-10%', left: '-5%', animation: 'orbFloat1 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', bottom: '-15%', right: '-10%', animation: 'orbFloat2 10s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', top: '40%', right: '20%', animation: 'orbFloat3 7s ease-in-out infinite' }} />

      {/* Logo */}
      <div style={{
        width: '120px', height: '120px', borderRadius: '32px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'logoReveal 1s cubic-bezier(0.23,1,0.32,1) forwards, glowPulse 3s ease-in-out infinite',
        marginBottom: '2.5rem', position: 'relative', zIndex: 1,
        backdropFilter: 'blur(20px)'
      }}>
        <img src="/favicon.svg" alt="Logo" style={{ width: '76px', height: '76px', objectFit: 'contain' }} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '3rem', fontWeight: '800',
          margin: 0, letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'textSlide 0.8s cubic-bezier(0.23,1,0.32,1) 0.3s forwards', opacity: 0
        }}>
          DeliverMyFood
        </h1>
        <p style={{
          color: '#64748b', fontSize: '1rem', fontWeight: '500',
          marginTop: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase',
          animation: 'textSlide 0.8s cubic-bezier(0.23,1,0.32,1) 0.5s forwards', opacity: 0
        }}>
          Deliver with pride, earn with ease
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: '4rem', width: '200px', height: '3px',
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px',
        overflow: 'hidden', position: 'relative', zIndex: 1
      }}>
        <div style={{
          position: 'absolute', height: '100%', borderRadius: '2px',
          background: 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)',
          width: `${Math.min(progress, 100)}%`,
          transition: 'width 0.3s ease-out',
          boxShadow: '0 0 8px rgba(16,185,129,0.5)'
        }} />
      </div>
    </div>
  );
};

export default Preloader;
