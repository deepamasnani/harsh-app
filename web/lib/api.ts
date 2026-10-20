type ApiOptions = Omit<RequestInit, "body"> & { body?: any; skipCache?: boolean; timeoutMs?: number };

const TTL_MS: Record<string, number> = {
  "/api/auth/me": 60_000,
  "/api/dashboard": 20_000,
  "/api/products": 25_000,
  "/api/customers": 25_000,
  "/api/returns": 12_000,
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err: unknown, status?: number) {
  if (status && [408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const name = err instanceof Error ? err.name : "";
  if (name === "AbortError") return true;
  const msg = err instanceof Error ? err.message : String(err || "");
  return /load failed|failed to fetch|networkerror|network request failed|timeout|timed out|econnreset|fetch failed/i.test(msg);
}

function friendlyError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (/load failed|failed to fetch|networkerror|network request failed|fetch failed/i.test(msg)) {
    return new Error("Could not reach the server. Try again.");
  }
  return err instanceof Error ? err : new Error(msg || "Request failed");
}

async function once<T>(path: string, options: ApiOptions): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body as BodyInit | undefined;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  const method = (options.method || "GET").toUpperCase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), options.timeoutMs || 18_000);
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      method,
      headers,
      body,
      credentials: "include",
      cache: "no-store",
      signal: options.signal || ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
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
    const err = new Error(typeof data?.detail === "string" ? data.detail : "Request failed");
    (err as any).status = res.status;
    throw err;
  }
  return data as T;
}

async function doFetch<T>(path: string, options: ApiOptions): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const tries = method === "GET" ? 3 : 2;
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await once<T>(path, options);
    } catch (err) {
      last = err;
      const status = (err as any)?.status as number | undefined;
      if (!isRetryable(err, status) || i === tries - 1) break;
      await sleep(400 * (i + 1) * (i + 1));
    }
  }
  throw friendlyError(last);
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
      .catch((err) => {
        if (hit) return hit.data as T;
        throw err;
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
