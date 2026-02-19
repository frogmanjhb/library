// Database types matching Prisma schema

export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  LIBRARIAN = 'LIBRARIAN',
}

export enum BookStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  passwordHash: string | null;
  role: Role;
  grade: number | null;
  class: string | null;
  lexileLevel: number | null;
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
  comment: string | null;
  lexileLevel: number | null;
  wordCount: number | null;
  ageRange: string | null;
  genres: string[];
  coverUrl: string | null;
  userId: string;
  status: BookStatus;
  verificationNote: string | null;
  verifiedAt: Date | null;
  verifiedById: string | null;
  pointsAwarded: boolean;
  pointsAwardedValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Point {
  id: string;
  userId: string;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Announcement {
  id: string;
  message: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  bookId: string;
  teacherId: string;
  reactions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentLexile {
  id: string;
  userId: string;
  term: number;
  year: number;
  lexile: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types with relations
export interface BookWithRelations extends Book {
  user?: Pick<User, 'id' | 'name' | 'email' | 'grade' | 'class'>;
  verifiedBy?: Pick<User, 'id' | 'name' | 'email'> | null;
  comments?: (Comment & { teacher?: Pick<User, 'id' | 'name' | 'email'> })[];
}

export interface UserWithPoints extends User {
  points?: Point | null;
}

export interface UserWithBooks extends User {
  books?: Book[];
}

export interface AnnouncementWithAuthor extends Announcement {
  author?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface CommentWithTeacher extends Comment {
  teacher?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface StudentLexileWithUser extends StudentLexile {
  user?: Pick<User, 'id' | 'name' | 'grade' | 'class'>;
}
