/** Browser fetch for `/api/admin/*` — cookies sent on same origin. */
export async function adminGet<T>(pathAndQuery: string): Promise<T> {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery.slice(1) : pathAndQuery;
  const res = await fetch(`/api/admin/${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Returns `null` when the API responds with 404 (e.g. missing entity). */
export async function adminGetNullable<T>(pathAndQuery: string): Promise<T | null> {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery.slice(1) : pathAndQuery;
  const res = await fetch(`/api/admin/${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
