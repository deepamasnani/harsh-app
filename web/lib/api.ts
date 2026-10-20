type ApiOptions = Omit<RequestInit, "body"> & { body?: any; skipCache?: boolean };

const TTL_MS: Record<string, number> = {
  "/api/auth/me": 60_000,
  "/api/dashboard": 20_000,
  "/api/products": 25_000,
  "/api/customers": 25_000,
  "/api/credits": 15_000,
  "/api/invoices": 12_000,
  "/api/stats": 30_000,
};

const mem = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function ttlFor(path: string) {
  const base = path.split("?")[0];
  for (const [prefix, ms] of Object.entries(TTL_MS)) {
    if (base === prefix || base.startsWith(`${prefix}/`)) return ms;
  }
  return 8_000;
}

export function invalidateApi(prefix?: string) {
  if (!prefix) {
    mem.clear();
    return;
  }
  for (const key of [...mem.keys()]) {
    if (key.includes(prefix)) mem.delete(key);
  }
}

async function doFetch<T>(path: string, options: ApiOptions): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body as BodyInit | undefined;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  const res = await fetch(path, { ...options, headers, body, credentials: "include" });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (res.status === 401) {
    const onLogin = typeof window !== "undefined" && window.location.pathname.startsWith("/login");
    const sessionCheck = path.includes("/auth/me") || path.includes("/auth/login");
    if (typeof window !== "undefined" && !sessionCheck && !onLogin) {
      window.location.assign("/login");
    }
    throw new Error(data?.detail || "Please sign in again");
  }
  if (!res.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET" && !options.skipCache) {
    const hit = mem.get(path);
    if (hit && Date.now() - hit.at < ttlFor(path)) return hit.data as T;
    const pending = inflight.get(path);
    if (pending) return pending as Promise<T>;
    const job = doFetch<T>(path, options)
      .then((data) => {
        mem.set(path, { at: Date.now(), data });
        return data;
      })
      .finally(() => inflight.delete(path));
    inflight.set(path, job);
    return job;
  }
  const data = await doFetch<T>(path, options);
  if (method !== "GET") {
    invalidateApi("/api/invoices");
    invalidateApi("/api/dashboard");
    invalidateApi("/api/credits");
    invalidateApi("/api/products");
    invalidateApi("/api/customers");
    invalidateApi("/api/stats");
  }
  return data;
}
