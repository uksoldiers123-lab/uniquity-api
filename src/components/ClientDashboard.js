import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      // If you have tenant_id stored in user profile, fetch it here
      // For demo, attempt to fetch tenant via a join if you have a tenants table
      // Example (pseudo): const { data: t } = await supabase.from('tenant_users').select('tenant_id').eq('user_id', data.user.id).single();
      // setTenant(t?.tenant_id);
      // Then fetch invoices/payments for that tenant
      if (tenant) {
        const { data: inv } = await supabase.from('invoices').select('*').eq('tenant_id', tenant);
        setInvoices(inv ?? []);
        const { data: pay } = await supabase.from('payments').select('*').eq('tenant_id', tenant);
        setPayments(pay ?? []);
      }
    })();
  }, [tenant]);

  return (
    <div>
      <h2>Client Dashboard</h2>
      {user ? <p>Welcome, {user.email}</p> : <p>Loading client...</p>}

      <section>
        <h3>Invoices</h3>
        <table>
          <thead><tr><th>Invoice</th><th>Amount</th><th>Currency</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td>{i.stripe_invoice_id}</td>
                <td>{i.amount}</td>
                <td>{i.currency}</td>
                <td>{i.status}</td>
                <td>{i.due_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Payments</h3>
        <table>
          <thead><tr><th>Payment</th><th>Amount</th><th>Currency</th><th>Status</th><th>Paid At</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.stripe_payment_intent_id}</td>
                <td>{p.amount}</td>
                <td>{p.currency}</td>
                <td>{p.status}</td>
                <td>{p.paid_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
