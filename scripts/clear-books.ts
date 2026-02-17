/**
 * Clear all reading logs and book-related data.
 * - Deletes all Books (cascades to Comments)
 * - Resets all Points to 0
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all reading logs and book-related data...');

  // Delete all books (reading logs) — cascades to comments
  const deletedBooks = await prisma.book.deleteMany();
  console.log(`   Deleted ${deletedBooks.count} books (and related comments)`);

  // Reset all points to 0
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
