// src/pages/Overview.tsx
import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { createApiClient } from "../api";

type TenantToday = { name?: string; gross?: number; net?: number; fees?: number };
type TodaySummary = {
  totalGross: number;
  totalNet: number;
  totalStripeFees: number;
  totalPlatformFees: number;
  tenants?: TenantToday[];
};

const api = createApiClient({ baseURL: process.env.REACT_APP_API_BASE_URL || "", getAuthToken: () => localStorage.getItem("token") });

export const Overview: React.FC = () => {
  const [data, setData] = useState<TodaySummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.fetcher<TodaySummary>(`${process.env.REACT_APP_API_VERSION ?? ""}/ stripe/summary/today`.replace(/\s+/g, "")); // adjust path
        setData(res);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const tenants = data?.tenants ?? [];

  return (
    <div>
      <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Today Totals">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 6 }}>Total Gross (Today)</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {data ? `$${data.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
              </div>
            </div>
            <div>
              <div className="section-title" style={{ marginBottom: 6 }}>Total Net (Today)</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {data ? `$${data.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Today by Tenant">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>Tenant</th><th>Gross</th><th>Net</th><th>Fees</th></tr></thead>
            <tbody>
              {tenants.length === 0 && <tr><td colSpan={4}>No data</td></tr>}
              {tenants.map((t, i) => (
                <tr key={i}>
                  <td>{t.name ?? ""}</td>
                  <td>${(t.gross ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${(t.net ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{t.fees != null ? `$${t.fees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* More panels (Payments, Payouts, etc) can be wired similarly */}
    </div>
  );
};
