import fs from "node:fs/promises";
import path from "node:path";
import { getPool } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "sql/migrations");

export async function runMigrations() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const { rows } = await pool.query<{ name: string }>(`SELECT name FROM _migrations`);
  const applied = new Set(rows.map((row) => row.name));

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      console.log(`[db] applied migration ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`[db] failed migration ${file}`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
