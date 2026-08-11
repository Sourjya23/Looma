import { useEffect, useState } from 'react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="navbar-inner">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <a href="/" className="navbar-logo" id="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--color-text-primary)' }}>
            <img src="/logo-icon.png" alt="Looma Logo" style={{ height: '36px', width: 'auto' }} />
            <span style={{ letterSpacing: '-0.04em', fontWeight: 800, fontSize: '1.5rem' }}>Looma</span>
          </a>
        </div>
        
        {/* Desktop Links - Center */}
        <div className="hidden md:flex items-center justify-center gap-8" style={{ flex: 1 }}>
          <a href="/how-it-works" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">How it works</a>
          <a href="/#features" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">Features</a>
          <a href="/#process" className="text-gray-500 hover:text-black transition-colors text-sm font-medium">Process</a>
        </div>

        {/* Action Button - Right */}
        <div className="hidden md:flex items-center justify-end" style={{ flex: 1 }}>
          <a
            href="/login"
            className="btn-pill btn-pill-dark"
            style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}
          >
            Start Writing
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2 text-gray-600 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[80px] left-0 right-0 bg-white border-b border-gray-200 shadow-xl flex flex-col p-6 gap-6 animate-fade-in-up z-50">
          <a href="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-700 hover:text-black">How it works</a>
          <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-700 hover:text-black">Features</a>
          <a href="/#process" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-700 hover:text-black">Process</a>
          <div className="pt-4 border-t border-gray-100">
            <a
              href="/login"
              className="btn-pill btn-pill-dark w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Writing
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
