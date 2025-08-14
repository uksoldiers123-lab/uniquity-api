import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

function ClientDashboard() {
  const [payments, setPayments] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) console.error(userError);
      else setUser(userData.user);

      // Fetch payments for the logged-in user
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userData.user.id);
      if (paymentsError) console.error(paymentsError);
      else setPayments(paymentsData);
    }

    fetchData();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Client Dashboard</h1>
      <h2>Profile</h2>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>

      <h2>Payments</h2>
      <ul>
        {payments.map(payment => (
          <li key={payment.id}>
            {payment.amount} - {payment.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClientDashboard;
