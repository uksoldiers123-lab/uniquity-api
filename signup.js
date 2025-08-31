
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState(null);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push('/dashboard');
    });
  }, []);

  async function handleEmailSignUp(e) {
    e.preventDefault();
    setLoadingEmail(true);
    setError(null);
    const { user, session, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoadingEmail(false);
    if (error) {
      setError(error.message);
    } else {
      // Optional: create a profile row or assign default role in your own DB
      console.log('Please check your email to confirm your account.', user);
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
        <button type="submit" disabled={loadingEmail}>
          {loadingEmail ? 'Creating account...' : 'Sign up with Email'}
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
