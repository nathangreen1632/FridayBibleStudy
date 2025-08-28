export const NODE_ENV_VALUES = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof NODE_ENV_VALUES)[number];

export function parseNodeEnv(): NodeEnv {
  const v = process.env.NODE_ENV;
  return NODE_ENV_VALUES.includes(v as NodeEnv) ? (v as NodeEnv) : 'development';
}

export function req<T extends string>(name: T): string {
  const v = process.env[name];
  if (v == null || v === '') throw new Error(`Missing env: ${String(name)}`);
  return v;
}

export function opt<T extends string>(name: T, def = ''): string {
  const v = process.env[name];
  return v == null || v === '' ? def : v;
}

export function int<T extends string>(name: T, def?: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') {
    if (def === undefined) throw new Error(`Missing env: ${String(name)}`);
    return def;
  }
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Env ${String(name)} must be a number`);
  return n;
}
