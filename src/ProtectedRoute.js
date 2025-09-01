
import React, { useEffect, useState, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

// Optional: if you have a global AuthContext that already loads user/role, you can use it.
// import { AuthContext } from '../../context/AuthContext';

export function ProtectedRoute({ children, requiredRole = null }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  // If you have an AuthContext, you can uncomment and use it instead of local state:
  // const { user, loading, role, fetchRole } = useContext(AuthContext);

  // Step 1: fetch current user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      // If you have a separate role fetch, do it here after confirming user exists
      if (data?.user?.id) {
        const r = await fetchUserRole(data.user.id);
        setRole(r);
      }
      setLoading(false);
    })();
  }, []);

  async function fetchUserRole(userId) {
    // Replace with your real role source
    // Example approaches (adjust to your schema):
    // 1) tenant_users table
    const { data: tu } = await supabase.from('tenant_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (tu?.role) return tu.role;

    // 2) profiles table
    const { data: p } = await supabase.from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (p?.role) return p.role;

    // 3) tenants table (if role stored there)
    const { data: t } = await supabase.from('tenants')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (t?.role) return t.role;

    // Default to 'client'
    return 'client';
  }

  // If still loading, show a spinner/placeholder
  if (loading) return <div>Loading...</div>;

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a requiredRole is provided, enforce it
  if (requiredRole) {
    const isAuthorized = Array.isArray(requiredRole)
      ? requiredRole.includes(role)
      : role === requiredRole;

    if (!isAuthorized) {
      // Redirect to a safe default (client dashboard) or show an "Access Denied" page
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  }

  // If user is authenticated and authorized
  return <>{children}</>;
}
