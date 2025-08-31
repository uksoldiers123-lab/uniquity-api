import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      // Optional: fetch tenants overview for admin
      // const { data: t } = await supabase.from('tenants').select('*');
      // setTenants(t ?? []);
    })();
  }, []);

  function signOut() {
    supabase.auth.signOut();
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      {user ? <p>Welcome, {user.email}</p> : <p>Loading admin...</p>}
      <button onClick={signOut}>Sign Out</button>
      {/* Admin tenant overview could render below when you wire it up */}
    </div>
  );
}
