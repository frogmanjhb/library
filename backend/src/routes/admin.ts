import express from 'express';
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

  res.json(students);
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

export default router;
