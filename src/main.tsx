// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  // @ts-ignore
  ReactDOM.createRoot(root).render(<App />);
}
