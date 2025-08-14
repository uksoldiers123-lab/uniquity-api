import React from 'react';
import { Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function ProtectedRoute({ children }) {
  const user = supabase.auth.user();
  return user ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
