export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res: Response = await fetch(input, {
    credentials: 'include',
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

export async function apiRaw(path: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {

    accept: 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

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

export async function readBody(
  res: Response
): Promise<{ ok: boolean; status: number; body: any; contentType?: string }> {
  const status = res.status;
  const contentType = res.headers.get('content-type') || undefined;

  let raw = '';
  try {
    raw = await res.text();
  } catch {

  }

  let body: any = null;
  if (raw) {
    if (contentType?.toLowerCase().includes('application/json')) {
      try { body = JSON.parse(raw); } catch { body = raw; }
    } else {

      body = raw;
    }
  }

  return { ok: res.ok, status, body, contentType };
}
