import { code } from "ts-poet";

export const writeQueryApi = () => code`
/** Shared fetch helpers for TanStack Query — every /api/acaraje/* route replies { error } with a
 *  non-2xx status on failure, so a single ok-check covers all of them. */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? res.statusText);
  return data as T;
}

export async function apiMutate<T>(
  url: string,
  options: { method: "POST" | "PUT" | "DELETE"; body?: unknown },
): Promise<T> {
  const res = await fetch(url, {
    method: options.method,
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? res.statusText);
  return data as T;
}
`;

export default writeQueryApi;
