import { useState } from 'react';

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      title: 'Daily Writing Challenges',
      desc: 'Receive carefully crafted prompts every day to spark your creativity and build a consistent writing habit. Focused on different genres and techniques.',
    },
    {
      title: 'Distraction-Free Environment',
      desc: 'A minimalist editor that gets out of your way. No formatting bars, no popups. Just you, your thoughts, and the blank page.',
    },
    {
      title: 'Targeted Practice',
      desc: 'Set word counts and time limits for your sessions. Train yourself to write efficiently under constraints, just like professional authors.',
    },
    {
      title: 'Progress Tracking',
      desc: 'Visualize your writing journey with detailed statistics. Track your daily streaks, total word counts, and average session times.',
    },
  ];

  return (
    <section id="features" style={{ padding: 'clamp(4rem, 8vw, 8rem) 0' }}>
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* Left: Heading */}
          <div>
            <p className="eyebrow" style={{ color: 'var(--color-text-primary)' }}>The App</p>
            <h2 className="heading-giant" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', maxWidth: '600px' }}>
              Features. Practice, focus, & tracking—all in one clean editor.
            </h2>
          </div>

          {/* Right: Numbered Accordion/Tabs */}
          <div>
            <div style={{ borderBottom: '1px solid var(--color-border)' }}>
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="numbered-item"
                  style={{
                    cursor: 'pointer',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    borderBottom: 'none', // Overriding the default last-child border to handle it wrapper-level
                  }}
                  onClick={() => setActiveTab(idx)}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className="number">0{idx + 1}</span>
                    <span className="item-title" style={{ fontWeight: activeTab === idx ? 500 : 400 }}>{feature.title}</span>
                  </div>
                  
                  {/* Expandable content */}
                  <div style={{
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    maxHeight: activeTab === idx ? '200px' : '0',
                    opacity: activeTab === idx ? 1 : 0,
                    paddingLeft: '3rem',
                    marginTop: activeTab === idx ? '1rem' : '0',
                  }}>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
