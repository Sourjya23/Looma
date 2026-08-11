export function ProcessSection() {
  const steps = [
    {
      title: 'Set Your Goal',
      desc: 'Start your session by defining your constraints. Choose a time limit and a word count target based on today\'s challenge.',
    },
    {
      title: 'Write with Focus',
      desc: 'Enter the minimalist editor. The timer starts when you type your first word. No distractions, just pure writing flow.',
    },
    {
      title: 'Review and Submit',
      desc: 'Once you hit your targets or time is up, review your work. Submit your session to save it to your permanent portfolio.',
    }
  ];

  return (
    <section id="process" style={{ padding: 'clamp(4rem, 8vw, 8rem) 0' }}>
      <div className="section-container">
        <div style={{ marginBottom: '4rem' }}>
          <p className="eyebrow" style={{ color: 'var(--color-text-primary)' }}>How It Works</p>
          <h2 className="heading-giant" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
            Simple process.<br />
            <span className="text-faded">Powerful results.</span>
          </h2>
        </div>

        <div style={{ maxWidth: '800px' }}>
          {steps.map((step, idx) => (
            <div key={idx} className="process-step">
              <div className="step-number">0{idx + 1}</div>
              <div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
