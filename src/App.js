import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  return (
    <div>
      <h1>Welcome to Uniquity Solutions</h1>
      <p>This is the frontend application.</p>
    </div>
  );
}

export default App;
