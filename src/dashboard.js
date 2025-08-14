import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error(error);
      else setUser(data.user);
    }

    fetchUser();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      {user.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <ClientDashboard />
      )}
    </div>
  );
}

export default Dashboard;
