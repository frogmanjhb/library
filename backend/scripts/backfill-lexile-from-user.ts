/**
 * One-time backfill: copy User.lexileLevel into StudentLexile for the current term/year
 * so existing signups appear in the librarian Lexile section and student dashboard.
 *
 * Run from repo root: npm run backfill-lexile
 * Or from backend: npx tsx scripts/backfill-lexile-from-user.ts
 */
import { query, closePool } from '../src/lib/db';
import { getCurrentTermAndYear } from '../src/lib/academic';
import { getStudentLexile, upsertStudentLexile } from '../src/lib/db-helpers';

interface UserRow {
  id: string;
  lexileLevel: number;
}

async function main() {
  const { term, year } = getCurrentTermAndYear();
  console.log(`Backfilling User.lexileLevel → StudentLexile for term ${term}, year ${year}...`);

  const result = await query<UserRow>(
    'SELECT id, "lexileLevel" FROM "User" WHERE "lexileLevel" IS NOT NULL'
  );
  const users = result.rows;
  console.log(`Found ${users.length} user(s) with lexileLevel set.`);

  let created = 0;
  let skipped = 0;
  for (const user of users) {
    const existing = await getStudentLexile(user.id, term, year);
    if (existing) {
      skipped++;
      continue;
    }
    await upsertStudentLexile({
      userId: user.id,
      term,
      year,
      lexile: user.lexileLevel,
    });
    created++;
  }

  console.log(`Done. Created ${created} StudentLexile record(s), skipped ${skipped} (already had current term).`);
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
