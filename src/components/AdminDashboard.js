import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*');
      if (paymentsError) console.error(paymentsError);
      else setPayments(paymentsData);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (usersError) console.error(usersError);
      else setUsers(usersData);

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*');
      if (companiesError) console.error(companiesError);
      else setCompanies(companiesData);
    }

    fetchData();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <h2>Payments</h2>
      <ul>
        {payments.map(payment => (
          <li key={payment.id}>
            {payment.amount} - {payment.status}
          </li>
        ))}
      </ul>

      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.email} - {user.role}
          </li>
        ))}
      </ul>

      <h2>Companies</h2>
      <ul>
        {companies.map(company => (
          <li key={company.id}>
            {company.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminDashboard;
