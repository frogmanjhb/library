/**
 * Clear all reading logs and book-related data.
 * - Deletes all Books (cascades to Comments)
 * - Resets all Points to 0
 *
 * Run: npm run clear-books
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from '../src/lib/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL from .env (script is at backend/scripts/clear-books.ts)
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
const envContent = envPath ? fs.readFileSync(envPath, 'utf-8') : '';
const urlMatch = envContent.match(/DATABASE_URL\s*=\s*(.+)/);
const databaseUrl = urlMatch
  ? urlMatch[1].trim().replace(/^["']|["']$/g, '')
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL not found. Tried:', envPaths.join(', '));
  process.exit(1);
}

async function main() {
  console.log('🧹 Clearing all reading logs and book-related data...');

  const deletedBooks = await query('DELETE FROM "Book"');
  console.log(`   Deleted ${deletedBooks.rowCount || 0} books (and related comments)`);

  const resetPoints = await query('UPDATE "Point" SET "totalPoints" = 0');
  console.log(`   Reset ${resetPoints.rowCount || 0} user point records to 0`);

  console.log('✅ All reading logs and book-related data cleared.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
