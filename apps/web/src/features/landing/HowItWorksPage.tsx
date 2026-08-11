import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' }}>
      <Navbar />
      
      <main style={{ flex: 1, padding: '8rem 2rem 4rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1250px', width: '100%' }}>
          
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
            fontWeight: 700, 
            letterSpacing: '-0.04em', 
            marginBottom: '1.5rem',
            color: 'var(--color-text-primary)'
          }}>
            How Looma Works
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', marginBottom: '4rem', lineHeight: 1.6 }}>
            A simple, step-by-step guide for first-time story writers. Learn how to use Looma to practice your craft, test your creativity, and become a better storyteller.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#000', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 
              }}>
                1
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  Pick a Challenge
                </h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Once you sign in, head over to the dashboard and start a new writing challenge. You will be given an interesting prompt, a word count goal, and a time limit. This helps cure writer's block by giving you a clear, focused starting point.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#000', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 
              }}>
                2
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  Write Your Story
                </h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Enter the distraction-free writing environment. The clock starts ticking. Your only job is to let your creativity flow and write the story before the time runs out. Don't worry about being perfect—just get your ideas onto the page.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#000', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 
              }}>
                3
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  Get Instant AI Feedback
                </h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  When you submit your story, our AI acts as your personal editor. Within seconds, it will analyze your writing and give you a detailed breakdown of your strengths, weaknesses, pacing, and vocabulary. It tells you exactly how good your storytelling really is.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#000', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 
              }}>
                4
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  Revise and Polish
                </h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Based on the feedback, you can enter the Revision mode. Here, you apply the AI's suggestions to polish your draft. This iterative process is the secret to mastering the craft of writing.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#000', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 
              }}>
                5
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  Track Your Progress
                </h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  As you complete more challenges, your personalized dashboard will track your growth. Watch your vocabulary expand, your pacing improve, and your overall creativity score rise. You're not just writing; you're visibly leveling up as an author.
                </p>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '5rem', padding: '3rem', backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '1rem', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
              Ready to test your creativity?
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              Join thousands of writers who are mastering their craft.
            </p>
            <a href="/login" className="btn-pill btn-pill-dark" style={{ display: 'inline-flex', padding: '0.875rem 2rem', fontSize: '1.1rem' }}>
              Start Writing Now
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
