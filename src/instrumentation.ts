export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { runMigrations } = await import("./lib/db/migrate");
    const { seedDemoUsers } = await import("./lib/db/seed");

    await runMigrations();
    await seedDemoUsers();
  } catch (error) {
    // Don't crash the whole Next.js boot if the remote pooler is temporarily full.
    console.error("[db] startup migration/seed failed — app will continue", error);
  }
}
