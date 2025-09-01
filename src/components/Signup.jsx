import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to redirect based on role
  async function redirectToDashboard() {
    // Try to fetch user profile/role from your DB
    const { data: profile } = await supabase
      .from('tenants') // or your profiles table
      .select('role') // adjust to where you store role
      .eq('id', (await supabase.auth.getUser())?.data?.user?.id)
      .single();

    // Fallback: if you have a role in a user/profile table, use that
    const role = profile?.role || 'client';
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard'); // client
    }
  }

  async function handleEmailSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { user, error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) {
      setLoading(false);
      setError(signupError.message);
      return;
    }

    // Optional: auto sign-in after signup
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    // Redirect based on role
    await redirectToDashboard();
  }

  async function handleGitHubSignIn() {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
    // After OAuth flow completes, your app should redirect with role
  }

  useEffect(() => {
    // If user is already logged in, redirect immediately
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
      <h1>Sign Up</h1>
      <form onSubmit={handleEmailSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up with Email'}
        </button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>

      <hr style={{ margin: '1.5rem 0' }} />

      <button onClick={handleGitHubSignIn} aria-label="Sign up with GitHub" style={{ display: 'block', marginTop: 8 }}>
        Sign up with GitHub (admin)
      </button>
    </div>
  );
}
