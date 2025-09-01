import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: determine role for the current user
  async function getUserRole(userId) {
    // Adjust this to your actual schema
    // Example 1: if you store role on tenants table by user/tenant relationship
    // const { data } = await supabase.from('tenant_users')
    //   .select('role')
    //   .eq('user_id', userId)
    //   .maybeSingle();

    // Example 2: if you store role in a profiles table
    // const { data } = await supabase.from('profiles')
    //   .select('role')
    //   .eq('user_id', userId)
    //   .maybeSingle();

    // Example 3: if you store role in tenants table (as a field on the tenant)
    // const { data } = await supabase.from('tenants')
    //   .select('role')
    //   .eq('user_id', userId)
    //   .maybeSingle();

    // For now, try a generic approach:
    try {
      // First, try common tables
      const { data: profile1 } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile1?.role) return profile1.role;

      const { data: profile2 } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profile2?.role) return profile2.role;

      // Fallback: if you attach role via tenant’s role or a similar field
      const { data: profile3 } = await supabase
        .from('tenants')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      return profile3?.role || 'client';
    } catch {
      return 'client';
    }
  }

  // If user is already logged in, redirect appropriately
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = await getUserRole(user.id);
        redirectByRole(role);
      }
    })();
  }, []);

  function redirectByRole(role) {
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  }

  async function handleEmailSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { user, error: signupError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    // Optional: create a profile in your own DB here (e.g., assign default role)
    // You might want to create a tenant/user-row with a default role of 'client'
    // Example (pseudo):
    // await supabase.from('tenant_users').insert([{ user_id: user.id, role: 'client' }]);

    // After signup, you may want to sign in the user automatically
    // to enable immediate redirects (depends on your flow and email confirmation)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      // If sign-in fails (e.g., email not confirmed), show error but keep signup state
      setError(signInError.message);
      return;
    }

    // Fetch role and redirect
    const role = await getUserRole(user.id);
    redirectByRole(role);
  }

  async function handleGitHubSignIn() {
    // Admins only sign-in; tenants sign-in via email/password
    await supabase.auth.signInWithOAuth({ provider: 'github' });
    // After OAuth flow, you should handle redirection on the callback page
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

      <button
        onClick={handleGitHubSignIn}
        aria-label="Sign up with GitHub"
        style={{ display: 'block', marginTop: 8 }}
      >
        Sign up with GitHub (admin)
      </button>
    </div>
  );
}
