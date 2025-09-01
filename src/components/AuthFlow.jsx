
import { supabase } from '../utils/supabaseClient';
import { redirectByRole } from '../utils/redirectByRole';

async function getUserRole(userId) {
  // Adjust to your actual role storage
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.role) return profile.role;

  const { data: tu } = await supabase.from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (tu?.role) return tu.role;

  return 'client';
}

// After signup:
async function onSignupSuccess(user) {
  const role = await getUserRole(user.id);
  redirectByRole(role);
}

// After login:
async function onLoginSuccess() {
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getUserRole(user?.id);
  redirectByRole(role);
}
