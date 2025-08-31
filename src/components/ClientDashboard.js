import React, { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user ?? null;
      setUser(u);

      if (!u) {
        // redirect to login if not authenticated
        window.location.href = '/login';
        return;
      }

      // Get tenant_id for this user from tenant_users
      const { data: tu } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', u.id)
        .maybeSingle();

      const tid = tu?.tenant_id;
      if (tid) {
        setTenantId(tid);

        // Fetch invoices and payments for this tenant
        const { data: inv } = await supabase.from('invoices').select('*').eq('tenant_id', tid);
        setInvoices(inv ?? []);

        const { data: pay } = await supabase.from('payments').select('*').eq('tenant_id', tid);
        setPayments(pay ?? []);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <header className="hero" style={{ marginBottom: 20 }}>
        <h1>Client Dashboard</h1>
        {user ? <p>Welcome, {user.email}</p> : null}
      </header>

      {tenantId ? (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <section className="panel card">
            <div className="section-title">Invoices</div>
            <table>
              <thead><tr><th>Invoice</th><th>Amount</th><th>Currency</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td>{i.stripe_invoice_id || '—'}</td>
                    <td>{i.amount}</td>
                    <td>{i.currency}</td>
                    <td>{i.status}</td>
                    <td>{i.due_date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel card">
            <div className="section-title">Payments</div>
            <table>
              <thead><tr><th>Payment</th><th>Amount</th><th>Currency</th><th>Status</th><th>Paid At</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.stripe_payment_intent_id || '—'}</td>
                    <td>{p.amount}</td>
                    <td>{p.currency}</td>
                    <td>{p.status}</td>
                    <td>{p.paid_at ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : (
        <div className="panel card">
          <p>No tenant association found for your user. Contact admin to link your account.</p>
        </div>
      )}
    </div>
  );
}
