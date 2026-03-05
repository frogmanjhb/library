/**
 * One-time: move all StudentLexile records from Term 2 to Term 1 (same year).
 * Use after fixing the academic calendar so Jan–Apr = Term 1.
 *
 * Run from backend: npx tsx scripts/move-lexile-term2-to-term1.ts
 */
import { query, closePool } from '../src/lib/db';
import { upsertStudentLexile } from '../src/lib/db-helpers';

interface StudentLexileRow {
  id: string;
  userId: string;
  term: number;
  year: number;
  lexile: number;
}

async function main() {
  const term2Rows = await query<StudentLexileRow>(
    'SELECT id, "userId", term, year, lexile FROM "StudentLexile" WHERE term = 2'
  );

  console.log(`Found ${term2Rows.rows.length} StudentLexile record(s) with term = 2. Moving to term 1...`);

  for (const row of term2Rows.rows) {
    await upsertStudentLexile({
      userId: row.userId,
      term: 1,
      year: row.year,
      lexile: row.lexile,
    });
  }

  const deleted = await query('DELETE FROM "StudentLexile" WHERE term = 2');
  console.log(`Moved ${term2Rows.rows.length} record(s) to term 1 and deleted ${deleted.rowCount} term 2 row(s).`);
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
