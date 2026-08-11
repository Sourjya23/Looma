import { useState, useEffect } from 'react';

export function Preloader() {
  const [phase, setPhase] = useState<'gif' | 'logo' | 'split' | 'done'>(() => {
    return sessionStorage.getItem('preloader_shown') ? 'done' : 'gif';
  });

  useEffect(() => {
    if (phase === 'done') return;

    // 1. Show GIF for 2.5 seconds, then switch to Logo
    const t1 = setTimeout(() => {
      setPhase('logo');
    }, 2500);

    // 2. Show Logo for 1.5 seconds, then trigger split animation
    const t2 = setTimeout(() => {
      setPhase('split');
    }, 4000);

    // 3. Wait for split animation to finish (e.g. 1 second), then unmount
    const t3 = setTimeout(() => {
      setPhase('done');
      sessionStorage.setItem('preloader_shown', 'true');
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      pointerEvents: 'none',
      display: 'flex',
    }}>
      {/* LEFT HALF of the split */}
      <div style={{
        flex: 1,
        backgroundColor: '#fff0eb',
        transition: 'transform 1s cubic-bezier(0.77, 0, 0.175, 1)',
        transform: phase === 'split' ? 'translateX(-100%)' : 'translateX(0)',
        borderRight: phase === 'split' ? 'none' : '1px solid transparent',
      }} />

      {/* RIGHT HALF of the split */}
      <div style={{
        flex: 1,
        backgroundColor: '#fff0eb',
        transition: 'transform 1s cubic-bezier(0.77, 0, 0.175, 1)',
        transform: phase === 'split' ? 'translateX(100%)' : 'translateX(0)',
        borderLeft: phase === 'split' ? 'none' : '1px solid transparent',
      }} />

      {/* OVERLAY CONTENT (GIF & Logo) centered on top of the halves */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'split' ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}>

        {/* GIF Phase */}
        <img
          src="/preloader.gif"
          alt="Loading..."
          style={{
            maxWidth: '1400px',
            maxHeight: '180vh',
            objectFit: 'contain',
            position: 'absolute',
            opacity: phase === 'gif' ? 1 : 0,
            transform: phase === 'gif' ? 'scale(1)' : 'scale(1.05)',
            transition: 'all 0.5s ease',
          }}
        />

        {/* LOGO Phase */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          opacity: phase === 'logo' ? 1 : 0,
          transform: phase === 'logo' ? 'scale(1)' : 'scale(1.1)',
          transition: 'all 0.8s ease',
        }}>
          <img src="/logo-icon.png" alt="Looma Logo" style={{ height: '48px', width: 'auto' }} />
          <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-text-primary)' }}>Looma</span>
        </div>

      </div>
    </div>
  );
}
