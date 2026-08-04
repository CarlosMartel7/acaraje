/**
 * Returns a promise that never resolves or rejects.
 * Await it in an async Server Component to keep that route's `loading.tsx` visible.
 *
 * @example
 * ```tsx
 * import { neverResolve } from "@/scripts/loading";
 *
 * export default async function Page() {
 *   await neverResolve();
 *   return <MyContent />;
 * }
 * ```
 */
export function neverResolve(): Promise<never> {
  return new Promise(() => {});
}

/**
 * Same as {@link neverResolve}, as an async function for `await` at the top of a page.
 */
export async function hangForLoadingTest(): Promise<never> {
  return neverResolve();
}
