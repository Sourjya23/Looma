export function HeroSection() {
  return (
    <section className="animate-fade-in-up" style={{ padding: 'clamp(4rem, 10vw, 8rem) 0 clamp(4rem, 8vw, 8rem)', position: 'relative' }}>
      <div className="section-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <h1 style={{ 
            fontSize: 'clamp(3.5rem, 8vw, 7rem)', 
            fontWeight: 500, 
            letterSpacing: '-0.04em', 
            lineHeight: 1.1, 
            marginBottom: '2.5rem',
            color: 'var(--color-text-primary)'
          }}>
            Discover How Good <br/>
            Your <span style={{ fontStyle: 'italic' }}>Storytelling</span> Really Is
          </h1>

          <p style={{ 
            fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', 
            color: 'var(--color-text-secondary)', 
            maxWidth: '800px', 
            margin: '0 auto 3rem auto',
            lineHeight: 1.5
          }}>
            The ultimate platform for writers to practice their craft, test their creative limits, and master the art of storytelling through guided challenges.
          </p>

          <div className="stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
            <a href="/login" className="btn-pill btn-pill-dark" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Start Writing Now
            </a>
            <a href="/how-it-works" className="btn-pill btn-pill-outline" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-45deg)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
