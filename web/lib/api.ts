type ApiOptions = Omit<RequestInit, "body"> & { body?: any };

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
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
