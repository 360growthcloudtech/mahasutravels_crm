import { Pool, type QueryResult, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function resolvePoolConfig() {
  const password = process.env.DATABASE_PASSWORD;
  if (!password) {
    throw new Error("DATABASE_PASSWORD is not set");
  }

  const host = process.env.DATABASE_HOST ?? "";
  const isSupabasePooler = /pooler\.supabase\.com/i.test(host);
  const poolMode = (process.env.DATABASE_POOL_MODE ?? "").toLowerCase();

  // Supabase: 5432 = session mode (hard ~15 client cap). Prefer 6543 transaction mode for Next.js.
  let port = Number(process.env.DATABASE_PORT ?? 5432);
  if (isSupabasePooler && port === 5432 && poolMode !== "session") {
    port = 6543;
  }

  const defaultMax = isSupabasePooler ? 3 : 5;
  const max = Math.min(Math.max(Number(process.env.DATABASE_POOL_MAX ?? defaultMax), 1), isSupabasePooler ? 5 : 8);

  return {
    host,
    port,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password,
    ssl: { rejectUnauthorized: false } as const,
    max,
    // Release idle clients quickly so pooler slots free up.
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
    // keepAlive holds session-mode slots; avoid it on Supabase pooler.
    keepAlive: !isSupabasePooler,
  };
}

export function getPool(): Pool {
  if (!globalForDb.pgPool) {
    const config = resolvePoolConfig();
    const pool = new Pool(config);

    pool.on("error", (err) => {
      console.error("[db] unexpected pool error", err);
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[db] pool ready host=${config.host} port=${config.port} max=${config.max}`
      );
    }

    globalForDb.pgPool = pool;
  }

  return globalForDb.pgPool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
