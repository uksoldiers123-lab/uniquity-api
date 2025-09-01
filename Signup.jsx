
import { supabase } from '../utils/supabaseClient';
import { redirectByRole } from '../utils/redirectByRole';

async function getUserRole(userId) {
  // Replace with your actual role source in Supabase
  // Example: query profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role) return profile.role;

  // Fallbacks
  const { data: tu } = await supabase.from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (tu?.role) return tu.role;

  return 'client';
}

// After successful signup
async function onSignupSuccess(user) {
  const role = await getUserRole(user.id);
  redirectByRole(role);
}
