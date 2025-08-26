// src/pages/Payments.tsx
import React, { useEffect, useState } from "react";

type Payment = {
  id: string;
  clientCode?: string;
  amount?: number;
  currency?: string;
  status?: string;
  created_at?: string;
};

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/v1/payments`);
      const data = await res.json();
      setPayments(data.payments ?? []);
    })();
  }, []);

  return (
    <div className="panel" aria-label="Payments">
      <div className="section-title">Recent Payments</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th>ID</th><th>Client</th><th>Amount</th><th>Currency</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.clientCode ?? ""}</td>
              <td>{p.amount ?? ""}</td>
              <td>{p.currency ?? ""}</td>
              <td>{p.status ?? ""}</td>
              <td>{p.created_at ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
