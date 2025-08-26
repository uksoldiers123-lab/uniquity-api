// src/pages/Audit.tsx
import React from "react";

export const Audit: React.FC = () => {
  return (
    <div className="panel" aria-label="Audit Logs">
      <div className="section-title">Audit Logs</div>
      <p>Filters: tenant, user, date range, action. Export to CSV/JSON later.</p>
      {/* Implement table based on /api/v1/audit */}
    </div>
  );
};
