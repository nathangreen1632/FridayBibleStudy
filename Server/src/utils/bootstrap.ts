// Server/src/utils/bootstrap.ts
import { Client as PgClient } from 'pg';
import type { ClientConfig } from 'pg';
import format from 'pg-format';
import { Op } from 'sequelize';                  // ⬅️ add
import { sequelize } from '../config/sequelize.config.js';
import { env } from '../config/env.config.js';
import { Group } from '../models/index.js';

// Allow: letters, digits, underscore; must start with a letter or underscore; <= 63 chars
const SAFE_DB_NAME = /^[A-Za-z_][\w$]{0,62}$/;

function parseAdminUrl(urlStr: string): { adminUrl: string; dbName: string } {
  const url = new URL(urlStr);
  const dbName = url.pathname.replace(/^\//, '');
  const admin = new URL(urlStr);
  admin.pathname = '/postgres'; // default admin DB
  return { adminUrl: admin.toString(), dbName };
}

async function ensureDatabaseExists(urlStr: string): Promise<void> {
  if (env.NODE_ENV === 'production') return;

  const { adminUrl, dbName } = parseAdminUrl(urlStr);

  if (!SAFE_DB_NAME.test(dbName)) {
    console.error(`[db] Unsafe database name "${dbName}". Skipping auto-create.`);
    return;
  }

  const client = new PgClient({ connectionString: adminUrl } as ClientConfig);
  await client.connect();

  try {
    const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (r.rowCount === 0) {
      const sql = format('CREATE DATABASE %I', dbName);
      await client.query(sql);
      console.log(`[db] created database "${dbName}"`);
    }
  } catch (e) {
    console.error('[db] ensureDatabaseExists error:', (e as Error).message);
  } finally {
    await client.end();
  }
}

/** Idempotent default Group bootstrap (migrates legacy slug → new slug). */
async function ensureDefaultGroup(): Promise<void> {
  const DEFAULT = {
    name: 'Friday Bible Study',
    slug: 'friday-bible-study',
    groupEmail: env.GROUP_EMAIL,
  };

  try {
    // Already correct?
    const existing = await Group.findOne({ where: { slug: DEFAULT.slug } });
    if (existing) {
      console.log('[db] group present:', existing.slug);
      return;
    }

    // Migrate legacy slug if present (keep same ID/FKs)
    const fromSlug = env.MIGRATE_FROM_GROUP_SLUG && env.MIGRATE_FROM_GROUP_SLUG !== env.GROUP_SLUG
      ? env.MIGRATE_FROM_GROUP_SLUG
      : '';

    if (fromSlug) {
      const legacy = await Group.findOne({ where: { slug: { [Op.in]: [fromSlug] } } });
      if (legacy) {
        legacy.name = env.GROUP_NAME;
        legacy.slug = env.GROUP_SLUG;
        if (!legacy.groupEmail && env.GROUP_EMAIL) legacy.groupEmail = env.GROUP_EMAIL;
        await legacy.save();
        console.log('[db] migrated Group slug to:', legacy.slug);
        return;
      }
    }

    // Nothing exists → create default
    const g = await Group.create(DEFAULT);
    console.log('[db] seeded Group:', g.slug);
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as any).message) : 'unknown error';
    console.warn('[db] group bootstrap skipped due to error:', msg);
  }
}

export async function initDb(): Promise<void> {
  await ensureDatabaseExists(env.DATABASE_URL);
  await sequelize.authenticate();
  await sequelize.sync({ alter: env.NODE_ENV !== 'production' });

  // ⬇️ replaces the old inline seed block
  await ensureDefaultGroup();

  console.log('[db] ready');
}
