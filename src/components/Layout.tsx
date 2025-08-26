// src/components/Layout.tsx
import React from "react";
import { Link } from "react-router-dom";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="brand" aria-label="Brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>Uniquity Solutions</span>
          </div>
          <div>
            <Link className="btn" to="/roles">Admin Roles</Link>
          </div>
        </div>
      </nav>
      <main style={{ padding: 20 }}>{children}</main>
    </div>
  );
};
