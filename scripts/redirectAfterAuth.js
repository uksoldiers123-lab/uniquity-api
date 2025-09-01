<script>
  // Pseudo-profile fetcher; replace with real queries to your DB/backend
  async function getUserRole(userId) {
    // If using Supabase:
    // 1) Check tenant_users table
    let { data } = await supabase.from('tenant_users').select('role').eq('user_id', userId).maybeSingle();
    if (data?.role) return data.role;

    // 2) Check profiles table
    const { data: p } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (p?.role) return p.role;

    // 3) Default
    return 'client';
  }

  function redirectByRole(role) {
    if (role === 'admin') {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/dashboard';
    }
  }

  // Example: run after page load if there is a current session
  // (Only if you’re using client-side sessions)
  (async () => {
    if (typeof window === 'undefined') return;
    // If you use Supabase:
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user) {
    //   const role = await getUserRole(user.id);
    //   redirectByRole(role);
    // }
  })();
</script>
