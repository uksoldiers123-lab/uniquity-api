const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ziltrcaehpshkwganlcy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
module.exports = supabase;
