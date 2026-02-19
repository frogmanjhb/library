import { query } from './db';
import {
  User,
  Book,
  Point,
  Announcement,
  Comment,
  StudentLexile,
  BookWithRelations,
  UserWithPoints,
  UserWithBooks,
  AnnouncementWithAuthor,
  CommentWithTeacher,
  StudentLexileWithUser,
  Role,
  BookStatus,
} from '../types/database';

// User queries
export const getUserById = async (id: string): Promise<User | null> => {
  const result = await query<User>(
    'SELECT * FROM "User" WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query<User>(
    'SELECT * FROM "User" WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

export const getUserByGoogleId = async (googleId: string): Promise<User | null> => {
  const result = await query<User>(
    'SELECT * FROM "User" WHERE "googleId" = $1',
    [googleId]
  );
  return result.rows[0] || null;
};

export const createUser = async (userData: {
  email: string;
  name: string;
  surname?: string | null;
  passwordHash?: string | null;
  role?: Role;
  grade?: number | null;
  class?: string | null;
  lexileLevel?: number | null;
  googleId?: string | null;
}): Promise<User> => {
  const result = await query<User>(
    `INSERT INTO "User" (
      id, email, name, surname, "passwordHash", role, grade, class, "lexileLevel", "googleId", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
    ) RETURNING *`,
    [
      userData.email,
      userData.name,
      userData.surname || null,
      userData.passwordHash || null,
      userData.role || Role.STUDENT,
      userData.grade || null,
      userData.class || null,
      userData.lexileLevel || null,
      userData.googleId || null,
    ]
  );
  return result.rows[0];
};

export const updateUser = async (
  id: string,
  updates: Partial<{
    email: string;
    name: string;
    surname: string | null;
    passwordHash: string | null;
    role: Role;
    grade: number | null;
    class: string | null;
    lexileLevel: number | null;
    googleId: string | null;
  }>
): Promise<User> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key === 'passwordHash' ? '"passwordHash"' : 
                   key === 'googleId' ? '"googleId"' :
                   key === 'lexileLevel' ? '"lexileLevel"' :
                   key === 'createdAt' ? '"createdAt"' :
                   key === 'updatedAt' ? '"updatedAt"' : key;
      fields.push(`"${dbKey}" = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    const user = await getUserById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  fields.push('"updatedAt" = NOW()');
  values.push(id);

  const result = await query<User>(
    `UPDATE "User" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const findUsers = async (where: {
  role?: Role;
  grade?: number;
  class?: string;
  email?: string;
  id?: string;
}): Promise<User[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.role) {
    conditions.push(`role = $${paramCount}`);
    values.push(where.role);
    paramCount++;
  }
  if (where.grade !== undefined) {
    conditions.push(`grade = $${paramCount}`);
    values.push(where.grade);
    paramCount++;
  }
  if (where.class) {
    conditions.push(`class = $${paramCount}`);
    values.push(where.class);
    paramCount++;
  }
  if (where.email) {
    conditions.push(`email = $${paramCount}`);
    values.push(where.email);
    paramCount++;
  }
  if (where.id) {
    conditions.push(`id = $${paramCount}`);
    values.push(where.id);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<User>(
    `SELECT * FROM "User" ${whereClause}`,
    values
  );
  return result.rows;
};

export const deleteUser = async (id: string): Promise<void> => {
  await query('DELETE FROM "User" WHERE id = $1', [id]);
};

export const deleteUsers = async (ids: string[]): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await query(
    `DELETE FROM "User" WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return result.rowCount || 0;
};

export const updateUsers = async (
  ids: string[],
  updates: Partial<{
    grade: number | null;
    class: string | null;
  }>
): Promise<number> => {
  if (ids.length === 0) return 0;
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.grade !== undefined) {
    fields.push(`grade = $${paramCount}`);
    values.push(updates.grade);
    paramCount++;
  }
  if (updates.class !== undefined) {
    fields.push(`class = $${paramCount}`);
    values.push(updates.class);
    paramCount++;
  }

  if (fields.length === 0) return 0;

  fields.push('"updatedAt" = NOW()');
  values.push(ids);

  const result = await query(
    `UPDATE "User" SET ${fields.join(', ')} WHERE id = ANY($${paramCount}::uuid[])`,
    values
  );
  return result.rowCount || 0;
};

// Book queries
export const getBookById = async (id: string): Promise<Book | null> => {
  const result = await query<Book>(
    'SELECT * FROM "Book" WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const getBookWithRelations = async (id: string): Promise<BookWithRelations | null> => {
  const bookResult = await query<Book>(
    'SELECT * FROM "Book" WHERE id = $1',
    [id]
  );
  if (!bookResult.rows[0]) return null;

  const book = bookResult.rows[0];

  // Get user
  const userResult = await query<User>(
    'SELECT id, name, email, grade, class FROM "User" WHERE id = $1',
    [book.userId]
  );

  // Get verifiedBy
  let verifiedBy = null;
  if (book.verifiedById) {
    const verifiedByResult = await query<User>(
      'SELECT id, name, email FROM "User" WHERE id = $1',
      [book.verifiedById]
    );
    verifiedBy = verifiedByResult.rows[0] || null;
  }

  // Get comments with teacher
  const commentsResult = await query<Comment>(
    'SELECT * FROM "Comment" WHERE "bookId" = $1 ORDER BY "createdAt" DESC',
    [id]
  );
  const comments = await Promise.all(
    commentsResult.rows.map(async (comment) => {
      const teacherResult = await query<User>(
        'SELECT id, name, email FROM "User" WHERE id = $1',
        [comment.teacherId]
      );
      return {
        ...comment,
        teacher: teacherResult.rows[0] || undefined,
      };
    })
  );

  return {
    ...book,
    user: userResult.rows[0] || undefined,
    verifiedBy: verifiedBy || undefined,
    comments,
  };
};

export const findBooks = async (where: {
  userId?: string | string[];
  status?: BookStatus;
  id?: string | string[];
}): Promise<Book[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.userId) {
    if (Array.isArray(where.userId)) {
      conditions.push(`"userId" = ANY($${paramCount}::uuid[])`);
      values.push(where.userId);
    } else {
      conditions.push(`"userId" = $${paramCount}`);
      values.push(where.userId);
    }
    paramCount++;
  }
  if (where.status) {
    conditions.push(`status = $${paramCount}`);
    values.push(where.status);
    paramCount++;
  }
  if (where.id) {
    if (Array.isArray(where.id)) {
      conditions.push(`id = ANY($${paramCount}::uuid[])`);
      values.push(where.id);
    } else {
      conditions.push(`id = $${paramCount}`);
      values.push(where.id);
    }
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<Book>(
    `SELECT * FROM "Book" ${whereClause}`,
    values
  );
  return result.rows;
};

export const findBooksWithRelations = async (
  where: {
    userId?: string | string[];
    status?: BookStatus;
  },
  orderBy?: { field: string; order: 'asc' | 'desc' },
  limit?: number
): Promise<BookWithRelations[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.userId) {
    if (Array.isArray(where.userId)) {
      conditions.push(`b."userId" = ANY($${paramCount}::uuid[])`);
      values.push(where.userId);
    } else {
      conditions.push(`b."userId" = $${paramCount}`);
      values.push(where.userId);
    }
    paramCount++;
  }
  if (where.status) {
    conditions.push(`b.status = $${paramCount}`);
    values.push(where.status);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = orderBy
    ? `ORDER BY b."${orderBy.field}" ${orderBy.order.toUpperCase()}`
    : 'ORDER BY b."createdAt" DESC';
  const limitClause = limit ? `LIMIT $${paramCount}` : '';
  if (limit) {
    values.push(limit);
  }

  const result = await query<Book>(
    `SELECT b.* FROM "Book" b ${whereClause} ${orderClause} ${limitClause}`,
    values
  );

  // Fetch relations for each book
  const booksWithRelations = await Promise.all(
    result.rows.map(async (book) => {
      const userResult = await query<User>(
        'SELECT id, name, email, grade, class FROM "User" WHERE id = $1',
        [book.userId]
      );

      let verifiedBy = null;
      if (book.verifiedById) {
        const verifiedByResult = await query<User>(
          'SELECT id, name, email FROM "User" WHERE id = $1',
          [book.verifiedById]
        );
        verifiedBy = verifiedByResult.rows[0] || null;
      }

      const commentsResult = await query<Comment>(
        'SELECT * FROM "Comment" WHERE "bookId" = $1 ORDER BY "createdAt" DESC',
        [book.id]
      );
      const comments = await Promise.all(
        commentsResult.rows.map(async (comment) => {
          const teacherResult = await query<User>(
            'SELECT id, name, email FROM "User" WHERE id = $1',
            [comment.teacherId]
          );
          return {
            ...comment,
            teacher: teacherResult.rows[0] || undefined,
          };
        })
      );

      return {
        ...book,
        user: userResult.rows[0] || undefined,
        verifiedBy: verifiedBy || undefined,
        comments,
      };
    })
  );

  return booksWithRelations;
};

export const createBook = async (bookData: {
  title: string;
  author: string;
  rating: number;
  comment?: string | null;
  lexileLevel?: number | null;
  wordCount?: number | null;
  ageRange?: string | null;
  genres?: string[];
  coverUrl?: string | null;
  userId: string;
  status?: BookStatus;
}): Promise<Book> => {
  const result = await query<Book>(
    `INSERT INTO "Book" (
      id, title, author, rating, comment, "lexileLevel", "wordCount", "ageRange", genres, "coverUrl", "userId", status, "pointsAwarded", "pointsAwardedValue", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, 0, NOW(), NOW()
    ) RETURNING *`,
    [
      bookData.title,
      bookData.author,
      bookData.rating,
      bookData.comment || null,
      bookData.lexileLevel || null,
      bookData.wordCount || null,
      bookData.ageRange || null,
      bookData.genres || [],
      bookData.coverUrl || null,
      bookData.userId,
      bookData.status || BookStatus.PENDING,
    ]
  );
  return result.rows[0];
};

export const updateBook = async (
  id: string,
  updates: Partial<{
    title: string;
    author: string;
    rating: number;
    comment: string | null;
    lexileLevel: number | null;
    wordCount: number | null;
    ageRange: string | null;
    genres: string[];
    coverUrl: string | null;
    status: BookStatus;
    verificationNote: string | null;
    verifiedAt: Date | null;
    verifiedById: string | null;
    pointsAwarded: boolean;
    pointsAwardedValue: number;
  }>
): Promise<Book> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key === 'lexileLevel' ? '"lexileLevel"' :
                   key === 'wordCount' ? '"wordCount"' :
                   key === 'ageRange' ? '"ageRange"' :
                   key === 'coverUrl' ? '"coverUrl"' :
                   key === 'userId' ? '"userId"' :
                   key === 'verifiedAt' ? '"verifiedAt"' :
                   key === 'verifiedById' ? '"verifiedById"' :
                   key === 'verificationNote' ? '"verificationNote"' :
                   key === 'pointsAwarded' ? '"pointsAwarded"' :
                   key === 'pointsAwardedValue' ? '"pointsAwardedValue"' :
                   key === 'createdAt' ? '"createdAt"' :
                   key === 'updatedAt' ? '"updatedAt"' : key;
      fields.push(`"${dbKey}" = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    const book = await getBookById(id);
    if (!book) throw new Error('Book not found');
    return book;
  }

  fields.push('"updatedAt" = NOW()');
  values.push(id);

  const result = await query<Book>(
    `UPDATE "Book" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const updateBooks = async (
  ids: string[],
  updates: Partial<{
    status: BookStatus;
    lexileLevel: number | null;
    wordCount: number | null;
    ageRange: string | null;
    genres: string[];
  }>
): Promise<number> => {
  if (ids.length === 0) return 0;
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.status !== undefined) {
    fields.push(`status = $${paramCount}`);
    values.push(updates.status);
    paramCount++;
  }
  if (updates.lexileLevel !== undefined) {
    fields.push(`"lexileLevel" = $${paramCount}`);
    values.push(updates.lexileLevel);
    paramCount++;
  }
  if (updates.wordCount !== undefined) {
    fields.push(`"wordCount" = $${paramCount}`);
    values.push(updates.wordCount);
    paramCount++;
  }
  if (updates.ageRange !== undefined) {
    fields.push(`"ageRange" = $${paramCount}`);
    values.push(updates.ageRange);
    paramCount++;
  }
  if (updates.genres !== undefined) {
    fields.push(`genres = $${paramCount}`);
    values.push(updates.genres);
    paramCount++;
  }

  if (fields.length === 0) return 0;

  fields.push('"updatedAt" = NOW()');
  values.push(ids);

  const result = await query(
    `UPDATE "Book" SET ${fields.join(', ')} WHERE id = ANY($${paramCount}::uuid[])`,
    values
  );
  return result.rowCount || 0;
};

export const deleteBook = async (id: string): Promise<void> => {
  await query('DELETE FROM "Book" WHERE id = $1', [id]);
};

export const deleteBooks = async (ids: string[]): Promise<number> => {
  if (ids.length === 0) return 0;
  const result = await query(
    `DELETE FROM "Book" WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return result.rowCount || 0;
};

export const countBooks = async (where: {
  userId?: string;
  status?: BookStatus;
}): Promise<number> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.userId) {
    conditions.push(`"userId" = $${paramCount}`);
    values.push(where.userId);
    paramCount++;
  }
  if (where.status) {
    conditions.push(`status = $${paramCount}`);
    values.push(where.status);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "Book" ${whereClause}`,
    values
  );
  return parseInt(result.rows[0].count, 10);
};

export const aggregateBooks = async (
  where: {
    userId?: string;
    status?: BookStatus;
    lexileLevel?: { not: null } | null;
    wordCount?: { not: null } | null;
  },
  aggregate: {
    _sum?: { wordCount?: boolean };
    _avg?: { lexileLevel?: boolean };
    _count?: boolean;
  }
): Promise<{
  _sum?: { wordCount: number | null };
  _avg?: { lexileLevel: number | null };
  _count?: number;
}> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.userId) {
    conditions.push(`"userId" = $${paramCount}`);
    values.push(where.userId);
    paramCount++;
  }
  if (where.status) {
    conditions.push(`status = $${paramCount}`);
    values.push(where.status);
    paramCount++;
  }
  if (where.lexileLevel?.not === null) {
    conditions.push(`"lexileLevel" IS NOT NULL`);
  }
  if (where.wordCount?.not === null) {
    conditions.push(`"wordCount" IS NOT NULL`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const selects: string[] = [];
  if (aggregate._sum?.wordCount) {
    selects.push('SUM("wordCount") as "sumWordCount"');
  }
  if (aggregate._avg?.lexileLevel) {
    selects.push('AVG("lexileLevel") as "avgLexileLevel"');
  }
  if (aggregate._count) {
    selects.push('COUNT(*) as count');
  }

  const result = await query<{
    sumWordCount: string | null;
    avgLexileLevel: string | null;
    count: string;
  }>(
    `SELECT ${selects.join(', ')} FROM "Book" ${whereClause}`,
    values
  );

  const row = result.rows[0];
  return {
    _sum: aggregate._sum?.wordCount
      ? { wordCount: row.sumWordCount ? parseInt(row.sumWordCount, 10) : null }
      : undefined,
    _avg: aggregate._avg?.lexileLevel
      ? { lexileLevel: row.avgLexileLevel ? parseFloat(row.avgLexileLevel) : null }
      : undefined,
    _count: aggregate._count ? parseInt(row.count, 10) : undefined,
  };
};

// Point queries
export const getPointByUserId = async (userId: string): Promise<Point | null> => {
  const result = await query<Point>(
    'SELECT * FROM "Point" WHERE "userId" = $1',
    [userId]
  );
  return result.rows[0] || null;
};

export const createPoint = async (pointData: {
  userId: string;
  totalPoints?: number;
}): Promise<Point> => {
  const result = await query<Point>(
    `INSERT INTO "Point" (id, "userId", "totalPoints", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
     RETURNING *`,
    [pointData.userId, pointData.totalPoints || 0]
  );
  return result.rows[0];
};

export const updatePoint = async (
  userId: string,
  updates: Partial<{ totalPoints: number }> & { increment?: number }
): Promise<Point> => {
  if (updates.increment !== undefined) {
    const result = await query<Point>(
      `UPDATE "Point" SET "totalPoints" = "totalPoints" + $1, "updatedAt" = NOW()
       WHERE "userId" = $2 RETURNING *`,
      [updates.increment, userId]
    );
    if (result.rows[0]) return result.rows[0];
    // If no point exists, create one
    return createPoint({ userId, totalPoints: updates.increment });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.totalPoints !== undefined) {
    fields.push(`"totalPoints" = $${paramCount}`);
    values.push(updates.totalPoints);
    paramCount++;
  }

  if (fields.length === 0) {
    const point = await getPointByUserId(userId);
    if (!point) throw new Error('Point not found');
    return point;
  }

  fields.push('"updatedAt" = NOW()');
  values.push(userId);

  const result = await query<Point>(
    `UPDATE "Point" SET ${fields.join(', ')} WHERE "userId" = $${paramCount} RETURNING *`,
    values
  );
  if (result.rows[0]) return result.rows[0];
  throw new Error('Point not found');
};

export const upsertPoint = async (pointData: {
  userId: string;
  totalPoints?: number;
  increment?: number;
}): Promise<Point> => {
  if (pointData.increment !== undefined) {
    // Try to update first
    const result = await query<Point>(
      `UPDATE "Point" SET "totalPoints" = "totalPoints" + $1, "updatedAt" = NOW()
       WHERE "userId" = $2 RETURNING *`,
      [pointData.increment, pointData.userId]
    );
    if (result.rows[0]) return result.rows[0];
    // If no point exists, create one
    return createPoint({ userId: pointData.userId, totalPoints: pointData.increment });
  }

  const existing = await getPointByUserId(pointData.userId);
  if (existing) {
    return updatePoint(pointData.userId, { totalPoints: pointData.totalPoints || 0 });
  }
  return createPoint(pointData);
};

export const updatePoints = async (
  userId: string,
  updates: { increment?: number; decrement?: number }
): Promise<number> => {
  if (updates.increment !== undefined) {
    const result = await query(
      `UPDATE "Point" SET "totalPoints" = "totalPoints" + $1, "updatedAt" = NOW()
       WHERE "userId" = $2`,
      [updates.increment, userId]
    );
    return result.rowCount || 0;
  }
  if (updates.decrement !== undefined) {
    const result = await query(
      `UPDATE "Point" SET "totalPoints" = "totalPoints" - $1, "updatedAt" = NOW()
       WHERE "userId" = $2`,
      [updates.decrement, userId]
    );
    return result.rowCount || 0;
  }
  return 0;
};

// Announcement queries
export const findAnnouncements = async (limit?: number): Promise<AnnouncementWithAuthor[]> => {
  const limitClause = limit ? 'LIMIT $1' : '';
  const values = limit ? [limit] : [];
  
  const result = await query<Announcement>(
    `SELECT * FROM "Announcement" ORDER BY "createdAt" DESC ${limitClause}`,
    values
  );

  const announcements = await Promise.all(
    result.rows.map(async (announcement) => {
      const authorResult = await query<User>(
        'SELECT id, name, email FROM "User" WHERE id = $1',
        [announcement.createdBy]
      );
      return {
        ...announcement,
        author: authorResult.rows[0] || undefined,
      };
    })
  );

  return announcements;
};

export const createAnnouncement = async (announcementData: {
  message: string;
  createdBy: string;
}): Promise<AnnouncementWithAuthor> => {
  const result = await query<Announcement>(
    `INSERT INTO "Announcement" (id, message, "createdBy", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
     RETURNING *`,
    [announcementData.message, announcementData.createdBy]
  );

  const authorResult = await query<User>(
    'SELECT id, name, email FROM "User" WHERE id = $1',
    [announcementData.createdBy]
  );

  return {
    ...result.rows[0],
    author: authorResult.rows[0] || undefined,
  };
};

export const updateAnnouncement = async (
  id: string,
  updates: { message: string }
): Promise<AnnouncementWithAuthor> => {
  const result = await query<Announcement>(
    `UPDATE "Announcement" SET message = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
    [updates.message, id]
  );

  const announcement = result.rows[0];
  const authorResult = await query<User>(
    'SELECT id, name, email FROM "User" WHERE id = $1',
    [announcement.createdBy]
  );

  return {
    ...announcement,
    author: authorResult.rows[0] || undefined,
  };
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await query('DELETE FROM "Announcement" WHERE id = $1', [id]);
};

// Comment queries
export const findCommentsByBookId = async (bookId: string): Promise<CommentWithTeacher[]> => {
  const result = await query<Comment>(
    'SELECT * FROM "Comment" WHERE "bookId" = $1 ORDER BY "createdAt" DESC',
    [bookId]
  );

  const comments = await Promise.all(
    result.rows.map(async (comment) => {
      const teacherResult = await query<User>(
        'SELECT id, name, email FROM "User" WHERE id = $1',
        [comment.teacherId]
      );
      return {
        ...comment,
        teacher: teacherResult.rows[0] || undefined,
      };
    })
  );

  return comments;
};

export const getCommentById = async (id: string): Promise<Comment | null> => {
  const result = await query<Comment>(
    'SELECT * FROM "Comment" WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const createComment = async (commentData: {
  content: string;
  bookId: string;
  teacherId: string;
}): Promise<CommentWithTeacher> => {
  const result = await query<Comment>(
    `INSERT INTO "Comment" (id, content, "bookId", "teacherId", reactions, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW(), NOW())
     RETURNING *`,
    [commentData.content, commentData.bookId, commentData.teacherId]
  );

  const teacherResult = await query<User>(
    'SELECT id, name, email FROM "User" WHERE id = $1',
    [commentData.teacherId]
  );

  return {
    ...result.rows[0],
    teacher: teacherResult.rows[0] || undefined,
  };
};

export const updateComment = async (
  id: string,
  updates: { reactions?: number }
): Promise<Comment> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.reactions !== undefined) {
    fields.push(`reactions = reactions + $${paramCount}`);
    values.push(updates.reactions);
    paramCount++;
  }

  if (fields.length === 0) {
    const comment = await getCommentById(id);
    if (!comment) throw new Error('Comment not found');
    return comment;
  }

  fields.push('"updatedAt" = NOW()');
  values.push(id);

  const result = await query<Comment>(
    `UPDATE "Comment" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const deleteComment = async (id: string): Promise<void> => {
  await query('DELETE FROM "Comment" WHERE id = $1', [id]);
};

// StudentLexile queries
export const getStudentLexile = async (
  userId: string,
  term: number,
  year: number
): Promise<StudentLexile | null> => {
  const result = await query<StudentLexile>(
    'SELECT * FROM "StudentLexile" WHERE "userId" = $1 AND term = $2 AND year = $3',
    [userId, term, year]
  );
  return result.rows[0] || null;
};

export const findStudentLexiles = async (
  where: {
    userId?: string;
    year?: number;
    term?: number;
  },
  orderBy?: { field: string; order: 'asc' | 'desc' }[]
): Promise<StudentLexileWithUser[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.userId) {
    conditions.push(`"userId" = $${paramCount}`);
    values.push(where.userId);
    paramCount++;
  }
  if (where.year !== undefined) {
    conditions.push(`year = $${paramCount}`);
    values.push(where.year);
    paramCount++;
  }
  if (where.term !== undefined) {
    conditions.push(`term = $${paramCount}`);
    values.push(where.term);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  let orderClause = '';
  if (orderBy && orderBy.length > 0) {
    const orderParts = orderBy.map((o) => `"${o.field}" ${o.order.toUpperCase()}`);
    orderClause = `ORDER BY ${orderParts.join(', ')}`;
  } else {
    orderClause = 'ORDER BY year DESC, term DESC';
  }

  const result = await query<StudentLexile>(
    `SELECT * FROM "StudentLexile" ${whereClause} ${orderClause}`,
    values
  );

  const lexiles = await Promise.all(
    result.rows.map(async (lexile) => {
      const userResult = await query<User>(
        'SELECT id, name, grade, class FROM "User" WHERE id = $1',
        [lexile.userId]
      );
      return {
        ...lexile,
        user: userResult.rows[0] || undefined,
      };
    })
  );

  return lexiles;
};

export const upsertStudentLexile = async (lexileData: {
  userId: string;
  term: number;
  year: number;
  lexile: number;
}): Promise<StudentLexileWithUser> => {
  const result = await query<StudentLexile>(
    `INSERT INTO "StudentLexile" (id, "userId", term, year, lexile, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT ("userId", term, year) DO UPDATE
     SET lexile = $4, "updatedAt" = NOW()
     RETURNING *`,
    [lexileData.userId, lexileData.term, lexileData.year, lexileData.lexile]
  );

  const userResult = await query<User>(
    'SELECT id, name, grade, class FROM "User" WHERE id = $1',
    [lexileData.userId]
  );

  return {
    ...result.rows[0],
    user: userResult.rows[0] || undefined,
  };
};

export const findUsersWithLexiles = async (
  where: {
    role?: Role;
    grade?: number;
    class?: string;
  },
  lexileWhere?: {
    year?: number;
  }
): Promise<(User & { studentLexiles: StudentLexile[] })[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (where.role) {
    conditions.push(`u.role = $${paramCount}`);
    values.push(where.role);
    paramCount++;
  }
  if (where.grade !== undefined) {
    conditions.push(`u.grade = $${paramCount}`);
    values.push(where.grade);
    paramCount++;
  }
  if (where.class) {
    conditions.push(`u.class = $${paramCount}`);
    values.push(where.class);
    paramCount++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<User>(
    `SELECT u.* FROM "User" u ${whereClause} ORDER BY u.grade ASC, u.class ASC, u.name ASC`,
    values
  );

  const usersWithLexiles = await Promise.all(
    result.rows.map(async (user) => {
      const lexileConditions: string[] = [`"userId" = $1`];
      const lexileValues: unknown[] = [user.id];
      let lexileParamCount = 2;

      if (lexileWhere?.year !== undefined) {
        lexileConditions.push(`year = $${lexileParamCount}`);
        lexileValues.push(lexileWhere.year);
        lexileParamCount++;
      }

      const lexileWhereClause = lexileConditions.join(' AND ');
      const lexileResult = await query<StudentLexile>(
        `SELECT * FROM "StudentLexile" WHERE ${lexileWhereClause} ORDER BY term ASC`,
        lexileValues
      );

      return {
        ...user,
        studentLexiles: lexileResult.rows,
      };
    })
  );

  return usersWithLexiles;
};
