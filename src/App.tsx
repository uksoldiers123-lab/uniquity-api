// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Overview } from "./pages/Overview";
import { Payments } from "./pages/Payments";
import { Payouts } from "./pages/Payouts";
import { Roles } from "./pages/Roles";
import { Audit } from "./pages/Audit";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};
