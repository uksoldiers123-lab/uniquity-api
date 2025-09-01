import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function redirectToDashboard() {
    // Fetch role similarly to signup
    // Example: read from a profiles or tenants table
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Replace with your actual schema
    const { data: profile } = await supabase
      .from('tenants') // or 'profiles' table
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.role || 'client';
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      await redirectToDashboard();
    }
  }

  async function handleGitHubSignIn() {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await redirectToDashboard();
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem' }}>
      <h1>Sign In</h1>
      <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in with Email'}
        </button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>

      <hr style={{ margin: '1.5rem 0' }} />

      <button onClick={handleGitHubSignIn} aria-label="Sign in with GitHub" style={{ display: 'block' }}>
        Sign in with GitHub (admin)
      </button>
    </div>
  );
}
