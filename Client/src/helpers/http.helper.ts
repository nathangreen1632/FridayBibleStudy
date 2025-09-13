// Client/src/helpers/http.helper.ts

/**
 * Back-compat: default helper used across the app.
 * - Throws on !ok
 * - Parses JSON and returns typed payload
 */
export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res: Response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      // Keep headers last so callers can override if necessary
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // If the response isn't JSON, this will throw — same as your original contract.
  return (await res.json()) as T;
}

/**
 * Raw fetch that never throws and never parses.
 * Use this ONLY where you need to inspect status/content-type
 * or read the body yourself (e.g., Bible API edge cases).
 */
export async function apiRaw(path: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    // Accept JSON by default, but let callers override
    accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

  // Do NOT force 'Content-Type' on GET/HEAD; some servers dislike it.
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(path, {
    credentials: 'include',
    ...init,
    headers,
  });
}

/**
 * Safe body reader for raw responses. Never throws.
 * - If JSON parse succeeds -> body is the object
 * - Else -> body is the raw string
 */
export async function readBody(
  res: Response
): Promise<{ ok: boolean; status: number; body: any; contentType?: string }> {
  const status = res.status;
  const contentType = res.headers.get('content-type') || undefined;

  let raw = '';
  try {
    raw = await res.text();
  } catch {
    // ignore
  }

  let body: any = null;
  if (raw) {
    if (contentType?.toLowerCase().includes('application/json')) {
      try { body = JSON.parse(raw); } catch { body = raw; }
    } else {
      // Not JSON — return raw text so callers can handle HTML/plain
      body = raw;
    }
  }

  return { ok: res.ok, status, body, contentType };
}
