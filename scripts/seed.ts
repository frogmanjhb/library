import { PrismaClient, Role, BookStatus } from '@prisma/client';

const prisma = new PrismaClient();

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
  await prisma.comment.deleteMany();
  await prisma.book.deleteMany();
  await prisma.point.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();

  // Create librarian
  console.log('👤 Creating librarian...');
  const librarian = await prisma.user.create({
    data: {
      email: 'librarian@stpeters.co.za',
      name: 'Mrs. Smith',
      role: Role.LIBRARIAN,
    },
  });

  await prisma.point.create({
    data: {
      userId: librarian.id,
      totalPoints: 0,
    },
  });

  // Create teachers
  console.log('👨‍🏫 Creating teachers...');
  const teachers = [];
  for (let i = 1; i <= 2; i++) {
    const teacher = await prisma.user.create({
      data: {
        email: `teacher${i}@stpeters.co.za`,
        name: `Teacher ${i}`,
        role: Role.TEACHER,
        grade: i === 1 ? 3 : 4,
        class: 'A',
      },
    });

    await prisma.point.create({
      data: {
        userId: teacher.id,
        totalPoints: 0,
      },
    });

    teachers.push(teacher);
  }

  // Create students
  console.log('👦 Creating students...');
  const students = [];
  for (let grade = 3; grade <= 7; grade++) {
    for (const className of ['A', 'B']) {
      for (let studentNum = 1; studentNum <= 3; studentNum++) {
        const student = await prisma.user.create({
          data: {
            email: `student${grade}${className.toLowerCase()}${studentNum}@stpeters.co.za`,
            name: `Student ${grade}${className}${studentNum}`,
            role: Role.STUDENT,
            grade,
            class: className,
          },
        });

        students.push(student);

        // Create initial points entry
        await prisma.point.create({
          data: {
            userId: student.id,
            totalPoints: 0,
          },
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

      await prisma.book.create({
        data: {
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
          verificationNote,
          verifiedAt: isPending ? null : new Date(),
          verifiedById: isPending ? null : librarian.id,
          pointsAwarded: !isPending,
          pointsAwardedValue: !isPending ? Math.floor(bookData.words / 1000) : 0,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        },
      });

      // Add points (1 point per 1,000 words)
      if (!isPending) {
        const awardedPoints = Math.floor(bookData.words / 1000);
        if (awardedPoints > 0) {
          await prisma.point.update({
            where: { userId: student.id },
            data: { totalPoints: { increment: awardedPoints } },
          });
        }
      }

      totalBooks++;
    }
  }

  console.log(`✅ Created ${totalBooks} book logs`);

  // Create some comments
  console.log('💬 Creating comments...');
  const allBooks = await prisma.book.findMany({ take: 20 });
  for (const book of allBooks) {
    if (Math.random() > 0.5) {
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      await prisma.comment.create({
        data: {
          content: 'Great work! Keep reading!',
          bookId: book.id,
          teacherId: teacher.id,
          reactions: Math.floor(Math.random() * 5),
        },
      });
    }
  }

  // Create announcements
  console.log('📢 Creating announcements...');
  await prisma.announcement.create({
    data: {
      message: 'Welcome to the new reading challenge! Read 10 books this term to earn a special badge.',
      createdBy: librarian.id,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.announcement.create({
    data: {
      message: 'New books have arrived in the library! Come check them out.',
      createdBy: librarian.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.announcement.create({
    data: {
      message: 'Congratulations to our top readers this month! Keep up the amazing work!',
      createdBy: librarian.id,
    },
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
    await prisma.$disconnect();
  });

