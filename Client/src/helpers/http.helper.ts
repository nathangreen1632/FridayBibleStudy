// Client/src/helpers/http.helper.ts
export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res: Response = await fetch(input, {
    credentials: 'include',
    // Spread init first so our headers below are the final value
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
