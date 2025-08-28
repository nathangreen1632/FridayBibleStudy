// Server/src/utils/bootstrap.ts
import { Client as PgClient } from 'pg';
import type { ClientConfig } from 'pg';
import format from 'pg-format'; // <-- add this dependency
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
  // Extra defense: only attempt auto-create in non-prod and when explicitly allowed
  if (env.NODE_ENV === 'production') return;

  const { adminUrl, dbName } = parseAdminUrl(urlStr);

  // 1) Validate identifier to satisfy Sonar and prevent any injection risk
  if (!SAFE_DB_NAME.test(dbName)) {
    console.error(`[db] Unsafe database name "${dbName}". Skipping auto-create.`);
    return;
  }

  const client = new PgClient({ connectionString: adminUrl } as ClientConfig);
  await client.connect();

  try {
    // Parameterized for values (safe)
    const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (r.rowCount === 0) {
      // 2) Use identifier-escaping for the CREATE DATABASE statement
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

export async function initDb(): Promise<void> {
  await ensureDatabaseExists(env.DATABASE_URL);
  await sequelize.authenticate();
  await sequelize.sync({ alter: env.NODE_ENV !== 'production' });

  // minimal seed to ensure the single Group exists
  let g = await Group.findOne();
  if (!g) {
    g = await Group.create({
      name: 'Friday Night Bible Study',
      slug: 'friday-night-bible-study',
      groupEmail: env.GROUP_EMAIL,
    });
    console.log('[db] seeded Group:', g.slug);
  }

  console.log('[db] ready');
}
