import express from 'express';
import bcrypt from 'bcrypt';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { Role } from '../types/database';
import {
  findUsers,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deleteUsers,
  updateUsers,
  createPoint,
} from '../lib/db-helpers';

const router = express.Router();

// All admin routes require librarian
router.use(requireAuth, requireLibrarian);

interface StudentCreateInput {
  name: string;
  email: string;
  grade?: number;
  class?: string;
}

type PublicUser = {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  grade: number | null;
  class: string | null;
};

const sanitizeUser = (u: {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  grade: number | null;
  class: string | null;
}): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  surname: u.surname,
  grade: u.grade,
  class: u.class,
});

const normalizeSchoolEmail = (email: unknown): string => {
  if (typeof email !== 'string') throw new AppError('Email is required', 400);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@stpeters.co.za')) {
    throw new AppError('Only @stpeters.co.za emails allowed', 400);
  }
  return normalizedEmail;
};

const parseAndValidateGrade = (grade: unknown): number => {
  const gradeNum = typeof grade === 'number' ? grade : parseInt(String(grade), 10);
  if (Number.isNaN(gradeNum) || gradeNum < 3 || gradeNum > 7) {
    throw new AppError('Grade must be between 3 and 7', 400);
  }
  return gradeNum;
};

const validatePassword = (password: unknown): string => {
  if (typeof password !== 'string' || !password.trim()) {
    throw new AppError('Password is required', 400);
  }
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
  return password;
};

// List students with optional filters
router.get('/students', asyncHandler(async (req, res) => {
  const { grade, class: className } = req.query;

  const where: { role: Role; grade?: number; class?: string } = {
    role: Role.STUDENT,
  };
  if (grade !== undefined && grade !== '') {
    const g = parseInt(grade as string, 10);
    if (!Number.isNaN(g)) where.grade = g;
  }
  if (className !== undefined && className !== '') {
    where.class = className as string;
  }

  const students = await findUsers(where);

  res.json(students.map((s) => sanitizeUser(s)));
}));

// Create student(s) - single or bulk
router.post('/students', asyncHandler(async (req, res) => {
  const body = req.body;

  const toCreate: StudentCreateInput[] = [];

  if (Array.isArray(body.students)) {
    for (const s of body.students) {
      if (s?.name && s?.email) {
        toCreate.push({
          name: String(s.name).trim(),
          email: String(s.email).trim().toLowerCase(),
          grade: s.grade != null ? parseInt(s.grade, 10) : undefined,
          class: s.class != null ? String(s.class).trim() : undefined,
        });
      }
    }
  } else if (body.name && body.email) {
    toCreate.push({
      name: String(body.name).trim(),
      email: String(body.email).trim().toLowerCase(),
      grade: body.grade != null ? parseInt(body.grade, 10) : undefined,
      class: body.class != null ? String(body.class) : undefined,
    });
  }

  if (toCreate.length === 0) {
    throw new AppError('Provide at least one student with name and email', 400);
  }

  const created: unknown[] = [];
  const errors: { email: string; message: string }[] = [];

  for (const s of toCreate) {
    if (!s.email.endsWith('@stpeters.co.za')) {
      errors.push({ email: s.email, message: 'Only @stpeters.co.za emails allowed' });
      continue;
    }

    const existing = await getUserByEmail(s.email);
    if (existing) {
      errors.push({ email: s.email, message: 'Email already exists' });
      continue;
    }

    const user = await createUser({
      email: s.email,
      name: s.name,
      role: Role.STUDENT,
      grade: s.grade ?? null,
      class: s.class ?? null,
    });

    await createPoint({ userId: user.id, totalPoints: 0 });

    created.push({
      id: user.id,
      email: user.email,
      name: user.name,
      grade: user.grade,
      class: user.class,
    });
  }

  res.status(201).json({
    created,
    errors: errors.length > 0 ? errors : undefined,
  });
}));

// Update single student
router.put('/students/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, grade, class: className } = req.body;

  const student = await getUserById(id);

  if (!student || student.role !== 'STUDENT') {
    throw new AppError('Student not found', 404);
  }

  const updateData: Partial<{
    name: string;
    email: string;
    grade: number | null;
    class: string | null;
  }> = {};
  if (name !== undefined) updateData.name = String(name).trim();
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    if (!normalized.endsWith('@stpeters.co.za')) {
      throw new AppError('Only @stpeters.co.za emails allowed', 400);
    }
    const existing = await getUserByEmail(normalized);
    if (existing && existing.id !== id) throw new AppError('Email already in use', 400);
    updateData.email = normalized;
  }
  if (grade !== undefined) updateData.grade = grade === '' || grade === null ? null : parseInt(grade, 10);
  if (className !== undefined) updateData.class = className === '' || className === null ? null : String(className).trim();

  const updated = await updateUser(id, updateData);

  res.json(updated);
}));

// Bulk update students (grade/class)
router.patch('/students/bulk', asyncHandler(async (req, res) => {
  const { ids, grade, class: className } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array is required and must not be empty', 400);
  }

  const updateData: Record<string, unknown> = {};
  if (grade !== undefined) updateData.grade = grade === '' || grade === null ? null : parseInt(grade, 10);
  if (className !== undefined) updateData.class = className === '' || className === null ? null : String(className).trim();

  if (Object.keys(updateData).length === 0) {
    throw new AppError('Provide grade and/or class to update', 400);
  }

  const count = await updateUsers(ids, updateData);

  res.json({ updated: count });
}));

// Bulk delete students (must be before /:id to avoid "bulk" being matched as id)
router.delete('/students/bulk', asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array is required and must not be empty', 400);
  }

  const count = await deleteUsers(ids);

  res.json({ deleted: count });
}));

// Delete single student
router.delete('/students/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await getUserById(id);

  if (!student || student.role !== 'STUDENT') {
    throw new AppError('Student not found', 404);
  }

  await deleteUser(id);

  res.json({ message: 'Student deleted successfully' });
}));

// List teachers
router.get('/teachers', asyncHandler(async (req, res) => {
  const teachers = await findUsers({ role: Role.TEACHER });
  res.json(teachers.map((t) => sanitizeUser(t)));
}));

// Create a teacher account
router.post('/teachers', asyncHandler(async (req, res) => {
  const { name, surname, grade, class: className, email, password } = req.body as {
    name?: unknown;
    surname?: unknown;
    grade?: unknown;
    class?: unknown;
    email?: unknown;
    password?: unknown;
  };

  if (!name || !surname || grade === undefined || !className || !email || !password) {
    throw new AppError('All fields are required', 400);
  }

  const gradeNum = parseAndValidateGrade(grade);
  if (typeof className !== 'string' || !className.trim()) {
    throw new AppError('Class is required', 400);
  }

  const normalizedEmail = normalizeSchoolEmail(email);
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('Email already exists', 400);
  }

  const passwordStr = validatePassword(password);
  const passwordHash = await bcrypt.hash(passwordStr, 10);

  const user = await createUser({
    email: normalizedEmail,
    name: String(name).trim(),
    surname: String(surname).trim(),
    passwordHash,
    role: Role.TEACHER,
    grade: gradeNum,
    class: String(className).trim(),
    lexileLevel: null,
    googleId: null,
  });

  res.status(201).json({ created: sanitizeUser(user) });
}));

// Edit teacher details (excluding password)
router.put('/teachers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacher = await getUserById(id);

  if (!teacher || teacher.role !== Role.TEACHER) {
    throw new AppError('Teacher not found', 404);
  }

  const { name, surname, grade, class: className, email } = req.body as {
    name?: unknown;
    surname?: unknown;
    grade?: unknown;
    class?: unknown;
    email?: unknown;
  };

  const updateData: Partial<{
    email: string;
    name: string;
    surname: string | null;
    grade: number | null;
    class: string | null;
  }> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw new AppError('Name cannot be empty', 400);
    updateData.name = name.trim();
  }

  if (surname !== undefined) {
    if (typeof surname !== 'string' || !surname.trim()) throw new AppError('Surname cannot be empty', 400);
    updateData.surname = surname.trim();
  }

  if (email !== undefined) {
    const normalizedEmail = normalizeSchoolEmail(email);
    const existing = await getUserByEmail(normalizedEmail);
    if (existing && existing.id !== id) throw new AppError('Email already in use', 400);
    updateData.email = normalizedEmail;
  }

  // Teacher's grade/class are required for scoping, but we allow partial updates.
  if (grade !== undefined) {
    updateData.grade = parseAndValidateGrade(grade);
  }

  if (className !== undefined) {
    if (typeof className !== 'string' || !className.trim()) throw new AppError('Class is required', 400);
    updateData.class = className.trim();
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('Provide at least one field to update', 400);
  }

  const updated = await updateUser(id, updateData);
  res.json({ updated: sanitizeUser(updated) });
}));

// Delete teacher
router.delete('/teachers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacher = await getUserById(id);

  if (!teacher || teacher.role !== Role.TEACHER) {
    throw new AppError('Teacher not found', 404);
  }

  await deleteUser(id);
  res.json({ message: 'Teacher deleted successfully' });
}));

// List librarians
router.get('/librarians', asyncHandler(async (req, res) => {
  const librarians = await findUsers({ role: Role.LIBRARIAN });
  res.json(librarians.map((l) => sanitizeUser(l)));
}));

// Create a librarian account
router.post('/librarians', asyncHandler(async (req, res) => {
  const { name, surname, email, password } = req.body as {
    name?: unknown;
    surname?: unknown;
    email?: unknown;
    password?: unknown;
  };

  if (!name || !surname || !email || !password) {
    throw new AppError('All fields are required', 400);
  }

  const normalizedEmail = normalizeSchoolEmail(email);
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('Email already exists', 400);
  }

  const passwordStr = validatePassword(password);
  const passwordHash = await bcrypt.hash(passwordStr, 10);

  const user = await createUser({
    email: normalizedEmail,
    name: String(name).trim(),
    surname: String(surname).trim(),
    passwordHash,
    role: Role.LIBRARIAN,
    grade: null,
    class: null,
    lexileLevel: null,
    googleId: null,
  });

  res.status(201).json({ created: sanitizeUser(user) });
}));

// Edit librarian details (excluding password)
router.put('/librarians/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const librarian = await getUserById(id);

  if (!librarian || librarian.role !== Role.LIBRARIAN) {
    throw new AppError('Librarian not found', 404);
  }

  const { name, surname, email } = req.body as {
    name?: unknown;
    surname?: unknown;
    email?: unknown;
  };

  const updateData: Partial<{
    email: string;
    name: string;
    surname: string | null;
  }> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new AppError('Name cannot be empty', 400);
    }
    updateData.name = name.trim();
  }

  if (surname !== undefined) {
    if (surname === null) updateData.surname = null;
    else if (typeof surname === 'string') updateData.surname = surname.trim();
    else throw new AppError('Surname must be a string', 400);
  }

  if (email !== undefined) {
    const normalizedEmail = normalizeSchoolEmail(email);
    const existing = await getUserByEmail(normalizedEmail);
    if (existing && existing.id !== id) {
      throw new AppError('Email already in use', 400);
    }
    updateData.email = normalizedEmail;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('Provide at least one field to update', 400);
  }

  const updated = await updateUser(id, updateData);
  res.json({ updated: sanitizeUser(updated) });
}));

// Update current librarian password
router.post('/librarians/password', asyncHandler(async (req, res) => {
  const requester = req.user!;
  if (requester.role !== Role.LIBRARIAN) {
    throw new AppError('Insufficient permissions', 403);
  }

  const { newPassword, confirmPassword } = req.body as {
    newPassword?: unknown;
    confirmPassword?: unknown;
  };

  if (!newPassword || !confirmPassword) {
    throw new AppError('Password and confirm password are required', 400);
  }

  const newPasswordStr = validatePassword(newPassword);
  const confirmPasswordStr = typeof confirmPassword === 'string' ? confirmPassword : '';

  if (newPasswordStr !== confirmPasswordStr) {
    throw new AppError('Passwords do not match', 400);
  }

  const passwordHash = await bcrypt.hash(newPasswordStr, 10);
  await updateUser(requester.id, { passwordHash });

  res.json({ message: 'Password updated successfully' });
}));

export default router;
