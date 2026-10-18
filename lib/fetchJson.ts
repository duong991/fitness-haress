/**
 * GET a JSON endpoint and throw on a non-2xx response.
 *
 * Plain `res.json()` happily parses an API error body (`{ "error": "..." }`) and
 * hands it to the screen as if it were data, which then crashes on the first
 * missing field. Throwing lets each caller's `.catch` run instead.
 */
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as T;
}
