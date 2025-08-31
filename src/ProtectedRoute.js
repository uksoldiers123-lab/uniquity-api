
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data?.user ?? null);
        setLoading(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading...</div>;

  return user ? children : <Navigate to="/login" state={{ from: location }} />;
}
