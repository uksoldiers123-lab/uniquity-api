 React, { useEffect, useState } from "react";

type Role = { id: string; name: string; description?: string };
type Permission = string;

export const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions] = useState<Permission[]>([
    "view_payments","payouts","manage_users","view_audit","view_tenant_finances","refunds","adjust_fees"
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/v1/roles`);
      const data = await res.json();
      setRoles(data.roles ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="panel" aria-label="Roles & Permissions">
      <div className="section-title">Roles & Permissions</div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>Name</th><th>Description</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.description ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => alert("Open role editor UI to create/edit roles.")}>
              Create / Edit Role
            </button>
            <button className="btn" style={{ marginLeft: 8 }} onClick={() => alert("Open role-permissions editor for a role.")}>
              Edit Role Permissions
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="section-title" style={{ marginBottom: 6 }}>Permissions Catalog</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {permissions.map((p) => (
                <span key={p} className="chip">{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
