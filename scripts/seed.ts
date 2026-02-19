import { query, closePool } from '../backend/src/lib/db';
import { Role, BookStatus } from '../backend/src/types/database';
import {
  createUser,
  createPoint,
  createBook,
  createComment,
  createAnnouncement,
  updatePoint,
  findBooks,
} from '../backend/src/lib/db-helpers';

const bookTitles = [
  { title: 'Harry Potter and the Philosopher\'s Stone', author: 'J.K. Rowling', lexile: 880, words: 77325 },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', lexile: 1000, words: 95356 },
  { title: 'Charlotte\'s Web', author: 'E.B. White', lexile: 680, words: 31938 },
  { title: 'Percy Jackson: The Lightning Thief', author: 'Rick Riordan', lexile: 680, words: 87223 },
  { title: 'Wonder', author: 'R.J. Palacio', lexile: 790, words: 73053 },
  { title: 'The Lion, the Witch and the Wardrobe', author: 'C.S. Lewis', lexile: 940, words: 38421 },
  { title: 'Matilda', author: 'Roald Dahl', lexile: 840, words: 42506 },
  { title: 'Diary of a Wimpy Kid', author: 'Jeff Kinney', lexile: 950, words: 19895 },
  { title: 'The Giver', author: 'Lois Lowry', lexile: 760, words: 43617 },
  { title: 'Holes', author: 'Louis Sachar', lexile: 660, words: 46938 },
];

const sampleComments = [
  'This book was amazing! I couldn\'t put it down.',
  'I loved the characters and the story was very exciting.',
  'A bit slow at first but it got better.',
  'Great book! I want to read the next one in the series.',
  'Really enjoyed this. The ending was surprising!',
  'Good book, would recommend to friends.',
  'Interesting story with good life lessons.',
  'One of my favorite books this year!',
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await query('DELETE FROM "Comment"');
  await query('DELETE FROM "Book"');
  await query('DELETE FROM "Point"');
  await query('DELETE FROM "Announcement"');
  await query('DELETE FROM "StudentLexile"');
  await query('DELETE FROM "User"');

  // Create librarian
  console.log('👤 Creating librarian...');
  const librarian = await createUser({
    email: 'librarian@stpeters.co.za',
    name: 'Mrs. Smith',
    role: Role.LIBRARIAN,
  });

  await createPoint({
    userId: librarian.id,
    totalPoints: 0,
  });

  // Create teachers
  console.log('👨‍🏫 Creating teachers...');
  const teachers = [];
  for (let i = 1; i <= 2; i++) {
    const teacher = await createUser({
      email: `teacher${i}@stpeters.co.za`,
      name: `Teacher ${i}`,
      role: Role.TEACHER,
      grade: i === 1 ? 3 : 4,
      class: 'A',
    });

    await createPoint({
      userId: teacher.id,
      totalPoints: 0,
    });

    teachers.push(teacher);
  }

  // Create students
  console.log('👦 Creating students...');
  const students = [];
  for (let grade = 3; grade <= 7; grade++) {
    for (const className of ['A', 'B']) {
      for (let studentNum = 1; studentNum <= 3; studentNum++) {
        const student = await createUser({
          email: `student${grade}${className.toLowerCase()}${studentNum}@stpeters.co.za`,
          name: `Student ${grade}${className}${studentNum}`,
          role: Role.STUDENT,
          grade,
          class: className,
        });

        students.push(student);

        // Create initial points entry
        await createPoint({
          userId: student.id,
          totalPoints: 0,
        });
      }
    }
  }

  console.log(`✅ Created ${students.length} students`);

  // Create books for students
  console.log('📚 Creating book logs...');
  let totalBooks = 0;
  for (const student of students) {
    const numBooks = Math.floor(Math.random() * 8) + 3; // 3-10 books per student

    for (let i = 0; i < numBooks; i++) {
      const bookData = bookTitles[Math.floor(Math.random() * bookTitles.length)];
      const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars mostly
      const comment = sampleComments[Math.floor(Math.random() * sampleComments.length)];

      const isPending = Math.random() < 0.2;
      const verificationNote = !isPending && Math.random() < 0.3
        ? 'Great reflection - keep it up!'
        : null;

      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days

      const book = await createBook({
        title: bookData.title,
        author: bookData.author,
        rating,
        comment,
        lexileLevel: bookData.lexile + Math.floor(Math.random() * 100) - 50,
        wordCount: bookData.words,
        ageRange: `${student.grade}-${student.grade + 2}`,
        genres: ['Fiction', 'Adventure'],
        userId: student.id,
        status: isPending ? BookStatus.PENDING : BookStatus.APPROVED,
      });

      // Update book with verification details if approved
      if (!isPending) {
        const pointsAwardedValue = Math.floor(bookData.words / 1000);
        await query(
          `UPDATE "Book" SET 
            "verificationNote" = $1,
            "verifiedAt" = $2,
            "verifiedById" = $3,
            "pointsAwarded" = $4,
            "pointsAwardedValue" = $5,
            "createdAt" = $6
          WHERE id = $7`,
          [
            verificationNote,
            new Date(),
            librarian.id,
            true,
            pointsAwardedValue,
            createdAt,
            book.id,
          ]
        );

        // Add points (1 point per 1,000 words)
        if (pointsAwardedValue > 0) {
          await updatePoint(student.id, { increment: pointsAwardedValue });
        }
      } else {
        // Set createdAt for pending books
        await query(
          `UPDATE "Book" SET "createdAt" = $1 WHERE id = $2`,
          [createdAt, book.id]
        );
      }

      totalBooks++;
    }
  }

  console.log(`✅ Created ${totalBooks} book logs`);

  // Create some comments
  console.log('💬 Creating comments...');
  const allBooks = await findBooks({});
  const booksToComment = allBooks.slice(0, 20);
  for (const book of booksToComment) {
    if (Math.random() > 0.5) {
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      await createComment({
        content: 'Great work! Keep reading!',
        bookId: book.id,
        teacherId: teacher.id,
      });

      // Set random reactions
      const reactions = Math.floor(Math.random() * 5);
      if (reactions > 0) {
        await query(
          `UPDATE "Comment" SET reactions = $1 WHERE "bookId" = $2 AND "teacherId" = $3 ORDER BY "createdAt" DESC LIMIT 1`,
          [reactions, book.id, teacher.id]
        );
      }
    }
  }

  // Create announcements
  console.log('📢 Creating announcements...');
  await createAnnouncement({
    message: 'Welcome to the new reading challenge! Read 10 books this term to earn a special badge.',
    createdBy: librarian.id,
  });

  // Update createdAt for first announcement
  await query(
    `UPDATE "Announcement" SET "createdAt" = $1 WHERE "createdBy" = $2 ORDER BY "createdAt" DESC LIMIT 1`,
    [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), librarian.id]
  );

  await createAnnouncement({
    message: 'New books have arrived in the library! Come check them out.',
    createdBy: librarian.id,
  });

  // Update createdAt for second announcement
  await query(
    `UPDATE "Announcement" SET "createdAt" = $1 WHERE "createdBy" = $2 ORDER BY "createdAt" DESC LIMIT 1`,
    [new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), librarian.id]
  );

  await createAnnouncement({
    message: 'Congratulations to our top readers this month! Keep up the amazing work!',
    createdBy: librarian.id,
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📝 Sample Login Credentials:');
  console.log('-----------------------------------');
  console.log('Librarian: librarian@stpeters.co.za');
  console.log('Teacher 1: teacher1@stpeters.co.za (Grade 3A)');
  console.log('Teacher 2: teacher2@stpeters.co.za (Grade 4A)');
  console.log('Student: student3a1@stpeters.co.za (Grade 3A)');
  console.log('Student: student5b2@stpeters.co.za (Grade 5B)');
  console.log('Student: student7a3@stpeters.co.za (Grade 7A)');
  console.log('-----------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
