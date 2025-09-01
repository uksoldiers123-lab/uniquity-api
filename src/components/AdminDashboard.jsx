import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in; redirect to login
        window.location.href = '/signin';
        return;
      }
      setUser(user);

      // Load role from your DB, e.g., profiles/tenants table
      // Example: assume role is admin if user has admin flag
      const { data: profile } = await supabase
        .from('tenants')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role;
      if (role !== 'admin') {
        // Redirect non-admin users
        window.location.href = '/dashboard';
        return;
      }

      const { data: t } = await supabase.from('tenants').select('*');
      setTenants(t ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Loading admin dashboard...</div>;

  // ... rest of the component
}
