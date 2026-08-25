async function test() {
  const API = 'https://looma-t8eg.onrender.com/api';
  
  // 1. Register a test user
  const email = `test${Date.now()}@example.com`;
  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `test${Date.now()}`, email, password: 'password123' })
  });
  const regData = await reg.json();
  const token = regData.data.token;

  if (!token) {
    console.error('Registration failed:', regData);
    return;
  }
  console.log('Got token:', token.substring(0, 15) + '...');

  // 2. Generate challenge
  console.log('Calling /challenges/generate...');
  const res = await fetch(`${API}/challenges/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'beginner', timeLimit: 15, wordTarget: 500, mode: 'normal' })
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

test();
