import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";

const DEMO_USERS = [
  {
    name: "Priya Anand",
    email: "priya@mahasutravels.com",
    password: "Priya@123",
    phone: "+91 98170 11001",
    department: "Operations",
    role: "Super Admin",
  },
  {
    name: "Aman Verma",
    email: "aman@mahasutravels.com",
    password: "Aman@123",
    phone: "+91 98170 11002",
    department: "Sales",
    role: "Admin",
  },
  {
    name: "Sana Kapoor",
    email: "sana@mahasutravels.com",
    password: "Sana@123",
    phone: "+91 98170 11003",
    department: "Sales",
    role: "Employee",
  },
] as const;

export async function seedDemoUsers() {
  const pool = getPool();
  const existing = await pool.query(`SELECT 1 FROM users LIMIT 1`);
  if ((existing.rowCount ?? 0) > 0) return;

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone, department)
       VALUES ($1, $2, $3, $4, 'Active', $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, passwordHash, user.role, user.phone, user.department]
    );
  }

  console.log("[db] seeded demo users");
}
