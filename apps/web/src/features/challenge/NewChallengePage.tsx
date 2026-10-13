import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ChallengePreview } from '../challenge/ChallengePreview';
import { API_BASE } from '@/lib/api';

import toast from 'react-hot-toast';

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
        toast.error(data.message || 'Failed to start session');
      }
    } catch (e) {
      toast.error('Error starting session');
    }
  };

  if (!token) return null;

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-8 py-8">
      <ChallengePreview token={token} onStart={handleStartSession} />
    </div>
  );
}
