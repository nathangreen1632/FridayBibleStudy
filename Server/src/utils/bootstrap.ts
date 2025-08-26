import { Client as PgClient } from 'pg';
import type { ClientConfig } from 'pg';
import { sequelize } from '../config/sequelize.config.js';
import { env } from '../config/env.config.js';
import { Group } from '../models/index.js';

function parseAdminUrl(urlStr: string): { adminUrl: string; dbName: string } {
  const url = new URL(urlStr);
  const dbName = url.pathname.replace(/^\//, '');
  const admin = new URL(urlStr);
  admin.pathname = '/postgres'; // default admin DB
  return { adminUrl: admin.toString(), dbName };
}

async function ensureDatabaseExists(urlStr: string): Promise<void> {
  if (env.NODE_ENV === 'production') return; // Render DB already provisioned
  const { adminUrl, dbName } = parseAdminUrl(urlStr);
  const client = new PgClient({ connectionString: adminUrl } as ClientConfig);
  await client.connect();
  try {
    const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (r.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[db] created database "${dbName}"`);
    }
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
      groupEmail: env.GROUP_EMAIL
    });
    console.log('[db] seeded Group:', g.slug);
  }

  console.log('[db] ready');
}
