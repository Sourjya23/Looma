const footerLinks = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Features', href: '/#features' },
  { label: 'Process', href: '/#process' },
  { label: 'Start Writing', href: '/login' },
];

const ArrowIcon = () => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.664 11.334L11.331 4.667" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M4.664 4.667H11.331V11.334" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer-dark" id="footer">
      <div className="section-container" style={{ paddingTop: 'clamp(4rem, 8vw, 8rem)', paddingBottom: '2rem' }}>
        {/* Top section: Tagline + Links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: 'clamp(4rem, 8vw, 10rem)' }}>
          {/* Left — Tagline */}
          <div>
            <p className="footer-tagline">
              Master storytelling
              <br />
              <span className="faded">through practice.</span>
            </p>
          </div>

          {/* Right — Links */}
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-on-dark-muted)', marginBottom: '1.5rem', marginTop: 0 }}>
              Navigation
            </p>
            <div>
              {footerLinks.map((link) => (
                <a key={link.label} href={link.href} className="footer-link" id={`footer-link-${link.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <span>{link.label}</span>
                  <ArrowIcon />
                </a>
              ))}
            </div>

            {/* Social */}
            <div style={{ marginTop: '3rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-on-dark-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                Built By
                <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
                  <span style={{ color: 'var(--color-text-on-dark)', fontSize: '0.875rem' }}> Sourjya Mitra</span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom — Giant brand text */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-dark)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2.5rem)' }}>
            <img src="/logo-icon.png" alt="Looma Logo" style={{ height: 'clamp(3rem, 7vw, 6rem)', width: 'auto', objectFit: 'contain' }} />
            <p className="footer-brand-text" style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Looma
            </p>
          </div>
          <button
            onClick={scrollToTop}
            id="back-to-top"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-dark)',
              color: 'var(--color-text-on-dark-muted)',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              marginBottom: '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-text-on-dark-muted)';
              e.currentTarget.style.color = 'var(--color-text-on-dark)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-dark)';
              e.currentTarget.style.color = 'var(--color-text-on-dark-muted)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 15.1875V2.8125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M3.9375 7.875L9 2.8125L14.0625 7.875" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Back to top
          </button>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-on-dark-muted)' }}>
          <span>© 2026 Looma. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ color: 'var(--color-text-on-dark-muted)', textDecoration: 'none' }}>Terms</a>
            <span>•</span>
            <a href="#" style={{ color: 'var(--color-text-on-dark-muted)', textDecoration: 'none' }}>Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
