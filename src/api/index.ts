// src/api/index.ts
export type APIFetcher = <T = any>(path: string, opts?: RequestInit) => Promise<T>;

type Config = {
  baseURL: string;
  getAuthToken?: () => string | null;
};

export function createApiClient(cfg: Config) {
  const baseURL = cfg.baseURL.replace(/\/+$/, "");
  const getToken = cfg.getAuthToken;

  async function fetcher<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
    const url = `${baseURL}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    };
    const token = getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error: ${res.status} ${err || ""}`);
    }
    // @ts-ignore
    return res.json();
  }

  return { fetcher };
}
```

B) src/components/Card.tsx
```tsx
// src/components/Card.tsx
import React from "react";

type Props = React.PropsWithChildren<{
  title?: string;
}>;

export const Card: React.FC<Props> = ({ title, children }) => (
  <section className="card" aria-label={title ?? "card"}>
    {title && <div className="section-title" style={{ marginBottom: 8 }}>{title}</div>}
    <div>{children}</div>
  </section>
);
