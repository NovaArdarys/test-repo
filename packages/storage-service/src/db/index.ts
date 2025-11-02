import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schemas/index";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 6543),
  ssl: false,
  // connectionString: "postgresql://postgres.yiokveqrkxvdhzkqcyrd:vHb1mSnZgEV8NV5u@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres",
});
export const db = drizzle(pool, { schema });



export async function connectDatabase(): Promise<void> {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("FATAL: Database connection failed.", err);
    process.exit(1);
  }
}


export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDatabase() first.");
  }
  return db;
}

export async function checkDatabaseStatus(): Promise<string> {
  if (!pool) {
    return "Disconnected (Pool not initialized)";
  }
  try {
    await pool.query("SELECT 1");
    return "Connected";
  } catch (err) {
    return "Disconnected (Query failed)";
  }
}

export const checkDatabase = async (): Promise<Record<string, any>> => {
  try {
    await pool.query("SELECT 1");
    return {
      status: "Connected",
    };
  } catch (err) {
    console.error("Database connection failed:", err);
    return {
      status: "Disconnected", URL: process.env.DATABASE_URL || "Not Detected",
      error: (err as Error).message
    };
  }
};
