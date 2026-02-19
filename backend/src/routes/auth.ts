import express from 'express';
import bcrypt from 'bcrypt';
import { generateToken, requireAuth } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { Role } from '../types/database';
import { getUserByEmail, createUser, createPoint } from '../lib/db-helpers';

const router = express.Router();

// Student signup
router.post('/signup', asyncHandler(async (req, res) => {
  const { name, surname, class: studentClass, lexileLevel, email, password, confirmPassword } = req.body;

  if (!name || !surname || !studentClass || !email || !password || !confirmPassword) {
    throw new AppError('All fields are required', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@stpeters.co.za')) {
    throw new AppError('Only @stpeters.co.za email addresses are allowed', 400);
  }

  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError('An account with this email already exists', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUser({
    email: normalizedEmail,
    name: name.trim(),
    surname: surname.trim(),
    class: studentClass.trim(),
    lexileLevel: lexileLevel ? parseInt(lexileLevel, 10) : null,
    passwordHash,
      role: Role.STUDENT,
  });

  await createPoint({
    userId: user.id,
    totalPoints: 0,
  });

  const token = generateToken(user.id, user.email, user.role);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      grade: user.grade,
      class: user.class,
      lexileLevel: user.lexileLevel,
    },
  });
}));

// Login - supports both password auth (for signed-up students) and email-only (legacy)
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError('User not found. Please sign up first or use a valid @stpeters.co.za email.', 404);
  }

  // If user has password, require it
  if (user.passwordHash) {
    if (!password) {
      throw new AppError('Password is required', 400);
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid email or password', 401);
    }
  } else {
    // Legacy: email-only login for users without password (e.g. created by librarian)
    if (!normalizedEmail.endsWith('@stpeters.co.za')) {
      throw new AppError('Please use a @stpeters.co.za email.', 404);
    }
  }

  const token = generateToken(user.id, user.email, user.role);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      grade: user.grade,
      class: user.class,
      lexileLevel: user.lexileLevel,
    },
  });
}));

// Get current user
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    id: user!.id,
    email: user!.email,
    name: user!.name,
    surname: user!.surname,
    role: user!.role,
    grade: user!.grade,
    class: user!.class,
    lexileLevel: user!.lexileLevel,
  });
}));

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;

