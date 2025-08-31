import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleEmailSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { user, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Optional: create a profile in your own DB here
      navigate('/dashboard');
    }
  }

  async function handleGitHubSignIn() {
    // Admins only can use GitHub sign-in; tenants won't see this button unless you reveal it
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  }

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

      {/* GitHub sign-in button can be hidden by default for tenants; you can uncomment for admin use */}
      <button onClick={handleGitHubSignIn} aria-label="Sign up with GitHub" style={{ display: 'block', marginTop: 8 }}>
        Sign up with GitHub (admin)
      </button>
    </div>
  );
}
