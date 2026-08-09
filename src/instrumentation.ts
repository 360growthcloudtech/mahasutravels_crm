export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runMigrations } = await import("./lib/db/migrate");
  const { seedDemoUsers } = await import("./lib/db/seed");

  await runMigrations();
  await seedDemoUsers();
}
