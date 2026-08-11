export function StatsSection() {
  const stats = [
    { number: '2M+', label: 'Words written by our active community' },
    { number: '300%', label: 'Average improvement in writing speed and focus' },
    { number: '1,000+', label: 'Daily writing challenges completed every week' },
  ];

  return (
    <section style={{ padding: '0 0 clamp(4rem, 8vw, 8rem)' }}>
      <div className="section-container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '3rem',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          padding: '4rem 0',
        }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '1.5rem',
                borderRight: i !== stats.length - 1 ? '1px solid var(--color-border)' : 'none',
                paddingRight: i !== stats.length - 1 ? '3rem' : 0,
              }}
            >
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label" style={{ maxWidth: '200px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
          *Building habits. Fostering creativity.
        </p>
      </div>
    </section>
  );
}
