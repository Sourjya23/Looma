export function CtaSection() {
  return (
    <section style={{ padding: 'clamp(6rem, 12vw, 10rem) 0' }}>
      <div className="section-container" style={{ textAlign: 'center' }}>
        <h2 
          className="heading-giant" 
          style={{ 
            marginBottom: '3rem',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            letterSpacing: '-0.05em'
          }}
        >
          Sounds Good?
        </h2>
        <a 
          href="/login" 
          className="btn-pill btn-pill-outline"
          style={{
            fontSize: '1.125rem',
            padding: '1rem 2.5rem',
            borderWidth: '2px'
          }}
        >
          Start your first session
        </a>
      </div>
    </section>
  );
}
