import { Client, Pool, type QueryResult, type QueryResultRow } from "pg";

type DbGlobal = {
  pgPool?: Pool;
  pgPoolInit?: Promise<Pool>;
  pgPoolInfo?: { max: number; source: string };
};

const globalForDb = globalThis as unknown as DbGlobal;

type ConnOptions = {
  host: string;
  port: number;
  database: string | undefined;
  user: string | undefined;
  password: string;
  ssl: { rejectUnauthorized: false };
  isSupabasePooler: boolean;
};

function resolveConnectionOptions(): ConnOptions {
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

  return {
    host,
    port,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password,
    ssl: { rejectUnauthorized: false },
    isSupabasePooler,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function parseEnvPoolMax(isSupabasePooler: boolean): number | null {
  const raw = process.env.DATABASE_POOL_MAX;
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const hardCap = isSupabasePooler ? 20 : 30;
  return clamp(Math.floor(n), 1, hardCap);
}

/** Fallback when probe is skipped/fails (still env-aware via NODE_ENV). */
function heuristicPoolMax(isSupabasePooler: boolean): { max: number; source: string } {
  const isProd = process.env.NODE_ENV === "production";
  if (isSupabasePooler) {
    return { max: isProd ? 8 : 3, source: isProd ? "heuristic:supabase-prod" : "heuristic:supabase-dev" };
  }
  return { max: isProd ? 12 : 5, source: isProd ? "heuristic:prod" : "heuristic:dev" };
}

/**
 * Probe Postgres max_connections and size this app's pool share.
 * DATABASE_POOL_INSTANCES = how many Node/Next replicas share the same DB.
 */
async function probePoolMax(conn: ConnOptions): Promise<{ max: number; source: string } | null> {
  const client = new Client({
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.user,
    password: conn.password,
    ssl: conn.ssl,
    connectionTimeoutMillis: 10_000,
  });

  try {
    await client.connect();
    const maxRes = await client.query<{ max_connections: string }>("SHOW max_connections");
    const maxConnections = Number(maxRes.rows[0]?.max_connections);
    if (!Number.isFinite(maxConnections) || maxConnections <= 0) return null;

    let active = 0;
    try {
      const activeRes = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()`
      );
      active = Number(activeRes.rows[0]?.n) || 0;
    } catch {
      // ignore — pooler may restrict pg_stat_activity
    }

    const instances = clamp(Number(process.env.DATABASE_POOL_INSTANCES ?? 1) || 1, 1, 20);
    // Keep a large reserve for Supabase services + other clients; take a fraction for this app.
    const shareRatio = conn.isSupabasePooler ? 0.2 : 0.3;
    const usable = Math.max(2, Math.floor(maxConnections * shareRatio));
    const freeish = Math.max(2, usable - Math.max(0, active - 1));
    const perInstance = Math.floor(freeish / instances);

    const hardCap = conn.isSupabasePooler ? 15 : 25;
    const softMin = process.env.NODE_ENV === "production" ? 4 : 2;
    const max = clamp(perInstance, softMin, hardCap);

    return {
      max,
      source: `probe:max_connections=${maxConnections},active≈${active},instances=${instances}`,
    };
  } catch (error) {
    console.warn("[db] pool max probe failed, using heuristic", error);
    return null;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

function buildPool(conn: ConnOptions, max: number, source: string): Pool {
  const pool = new Pool({
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.user,
    password: conn.password,
    ssl: conn.ssl,
    max,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
    keepAlive: !conn.isSupabasePooler,
  });

  pool.on("error", (err) => {
    console.error("[db] unexpected pool error", err);
  });

  globalForDb.pgPoolInfo = { max, source };
  console.log(`[db] pool ready host=${conn.host} port=${conn.port} max=${max} (${source})`);
  return pool;
}

/**
 * Resolve pool size: explicit env → probe max_connections → heuristic.
 * Call from instrumentation before migrations so the first pool is correctly sized.
 */
export async function initDbPool(): Promise<Pool> {
  if (globalForDb.pgPool) return globalForDb.pgPool;
  if (globalForDb.pgPoolInit) return globalForDb.pgPoolInit;

  globalForDb.pgPoolInit = (async () => {
    if (globalForDb.pgPool) return globalForDb.pgPool;

    const conn = resolveConnectionOptions();
    const fromEnv = parseEnvPoolMax(conn.isSupabasePooler);

    let max: number;
    let source: string;
    if (fromEnv != null) {
      max = fromEnv;
      source = "env:DATABASE_POOL_MAX";
    } else {
      const probed = await probePoolMax(conn);
      if (probed) {
        max = probed.max;
        source = probed.source;
      } else {
        const h = heuristicPoolMax(conn.isSupabasePooler);
        max = h.max;
        source = h.source;
      }
    }

    globalForDb.pgPool = buildPool(conn, max, source);
    return globalForDb.pgPool;
  })();

  try {
    return await globalForDb.pgPoolInit;
  } finally {
    globalForDb.pgPoolInit = undefined;
  }
}

/** Sync accessor — uses existing pool or creates a heuristic-sized one if init hasn't run. */
export function getPool(): Pool {
  if (globalForDb.pgPool) return globalForDb.pgPool;

  const conn = resolveConnectionOptions();
  const fromEnv = parseEnvPoolMax(conn.isSupabasePooler);
  const resolved =
    fromEnv != null
      ? { max: fromEnv, source: "env:DATABASE_POOL_MAX" }
      : heuristicPoolMax(conn.isSupabasePooler);

  globalForDb.pgPool = buildPool(conn, resolved.max, resolved.source);
  return globalForDb.pgPool;
}

export function getPoolInfo(): { max: number; source: string } | null {
  return globalForDb.pgPoolInfo ?? null;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
