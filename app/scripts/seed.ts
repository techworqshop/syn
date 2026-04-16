import postgres from "postgres";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL!;
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_INITIAL_PASSWORD!;
  if (!url || !email || !password) {
    console.error("DATABASE_URL / ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD required");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  const [existing] = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing) {
    console.log(`User ${email} already exists - skipping seed.`);
  } else {
    const hash = await bcrypt.hash(password, 12);
    await sql`INSERT INTO users (email, password_hash, name) VALUES (${email}, ${hash}, 'Tech Worqshop')`;
    console.log(`Seeded admin: ${email}`);
  }
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
