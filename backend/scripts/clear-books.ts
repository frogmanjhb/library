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
import { PrismaClient } from '@prisma/client';

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

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

async function main() {
  console.log('🧹 Clearing all reading logs and book-related data...');

  const deletedBooks = await prisma.book.deleteMany();
  console.log(`   Deleted ${deletedBooks.count} books (and related comments)`);

  const resetPoints = await prisma.point.updateMany({
    data: { totalPoints: 0 },
  });
  console.log(`   Reset ${resetPoints.count} user point records to 0`);

  console.log('✅ All reading logs and book-related data cleared.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
