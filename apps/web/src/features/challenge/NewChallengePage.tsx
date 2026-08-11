import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ChallengePreview } from '../challenge/ChallengePreview';
import { API_BASE } from '@/lib/api';

export function NewChallengePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleStartSession = async (challengePayload: any, config: any) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          challengeId: challengePayload.id,
          challengePayload, // Keep this as fallback just in case
          targetTime: config.time,
          wordTarget: config.words,
          difficulty: config.diff,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        navigate(`/writing/${data.data.id}`);
      } else {
        alert('Failed to start session');
      }
    } catch (e) {
      alert('Error starting session');
    }
  };

  if (!token) return null;

  return (
    <div style={{ padding: 'clamp(2rem, 5vw, 4rem)', width: '100%', height: '100%', overflowY: 'auto' }}>
      <ChallengePreview token={token} onStart={handleStartSession} />
    </div>
  );
}
