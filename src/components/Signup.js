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
    const { user, session, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Optionally, create a profile record in your own DB here
      console.log('Check your email to confirm your account', user);
      navigate('/dashboard');
    }
  }

  async function handleGitHubSignIn() {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem' }}>
      <h1>Sign Up</h1>

      <form onSubmit={handleEmailSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up with Email'}
        </button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>

      <hr style={{ margin: '1.5rem 0' }} />

      <button onClick={handleGitHubSignIn} aria-label="Sign up with GitHub">
        Sign up with GitHub
      </button>

      <p style={{ marginTop: '1rem' }}>
        By signing up, you agree to our terms. You’ll receive a confirmation email if you used email sign-up.
      </p>
    </div>
  );
}
