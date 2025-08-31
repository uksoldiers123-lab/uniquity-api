import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      const { data: t } = await supabase.from('tenants').select('*');
      setTenants(t ?? []);
    })();
  }, []);

  function signOut() {
    supabase.auth.signOut();
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Dashboard</h2>
      {user ? <p>Welcome, {user.email}</p> : <p>Loading...</p>}
      <button onClick={signOut}>Sign Out</button>

      <h3 style={{ marginTop: 20 }}>Tenants</h3>
      <ul>
        {tenants.map((t) => (
          <li key={t.id}>{t.name} - {t.business_id || '—'}</li>
        ))}
      </ul>
    </div>
  );
}
