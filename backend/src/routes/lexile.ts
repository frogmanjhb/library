import express from 'express';
import { requireAuth, requireLibrarian } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  getStudentLexile,
  findStudentLexiles,
  upsertStudentLexile,
  findUsersWithLexiles,
  getUserById,
} from '../lib/db-helpers';

const router = express.Router();

/**
 * Get current academic term and year
 */
function getCurrentTermAndYear(): { term: number; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  
  // Academic year typically runs from September to August
  // Term 1: Sep-Dec, Term 2: Jan-Apr, Term 3: May-Aug
  let term: number;
  let academicYear: number;
  
  if (month >= 9) {
    // Sep-Dec = Term 1 of next academic year
    term = 1;
    academicYear = year + 1; // Academic year is named by end year
  } else if (month >= 5) {
    // May-Aug = Term 3
    term = 3;
    academicYear = year;
  } else {
    // Jan-Apr = Term 2
    term = 2;
    academicYear = year;
  }
  
  return { term, year: academicYear };
}

/**
 * Get student's current lexile level (most recent entry)
 */
export async function getStudentCurrentLexile(userId: string): Promise<number | null> {
  const { term, year } = getCurrentTermAndYear();
  
  // First try to get current term's lexile
  let lexileRecord = await getStudentLexile(userId, term, year);
  
  // If not found, get the most recent lexile record
  if (!lexileRecord) {
    const records = await findStudentLexiles(
      { userId },
      [
        { field: 'year', order: 'desc' },
        { field: 'term', order: 'desc' }
      ]
    );
    lexileRecord = records[0] || null;
  }
  
  return lexileRecord?.lexile ?? null;
}

/**
 * GET /api/lexile/student/:userId
 * Get all lexile records for a student
 */
router.get('/student/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = req.user!;
  
  // Students can only view their own lexile data
  if (user.role === 'STUDENT' && user.id !== userId) {
    throw new AppError('Access denied', 403);
  }
  
  const lexileRecords = await findStudentLexiles(
    { userId },
    [
      { field: 'year', order: 'desc' },
      { field: 'term', order: 'desc' }
    ]
  );
  
  // Also include the current term info
  const { term: currentTerm, year: currentYear } = getCurrentTermAndYear();
  
  res.json({
    records: lexileRecords,
    currentTerm,
    currentYear,
    currentLexile: await getStudentCurrentLexile(userId)
  });
}));

/**
 * POST /api/lexile/student/:userId
 * Add or update a single lexile entry for a student
 */
router.post('/student/:userId', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { term, year, lexile } = req.body;
  
  // Validate inputs
  if (!term || !year || lexile === undefined) {
    throw new AppError('Term, year, and lexile are required', 400);
  }
  
  if (term < 1 || term > 3) {
    throw new AppError('Term must be 1, 2, or 3', 400);
  }
  
  if (lexile < 0 || lexile > 2000) {
    throw new AppError('Lexile must be between 0 and 2000', 400);
  }
  
  // Verify the user exists and is a student
  const student = await getUserById(userId);
  
  if (!student) {
    throw new AppError('Student not found', 404);
  }
  
  if (student.role !== 'STUDENT') {
    throw new AppError('User is not a student', 400);
  }
  
  // Upsert the lexile record
  const lexileRecord = await upsertStudentLexile({
    userId,
    term: parseInt(term),
    year: parseInt(year),
    lexile: parseInt(lexile)
  });
  
  res.json(lexileRecord);
}));

/**
 * POST /api/lexile/bulk
 * Bulk upload lexile levels from CSV-style text
 * Expected format: "Student Name, Lexile" per line
 */
router.post('/bulk', requireAuth, requireLibrarian, asyncHandler(async (req, res) => {
  const { data, term, year, grade, className } = req.body;
  
  if (!data || !term || !year) {
    throw new AppError('Data, term, and year are required', 400);
  }
  
  if (term < 1 || term > 3) {
    throw new AppError('Term must be 1, 2, or 3', 400);
  }
  
  // Parse the CSV data
  const lines = data.split('\n').filter((line: string) => line.trim());
  const results: { line: number; name: string; status: string; lexile?: number; error?: string }[] = [];
  
  // Get potential students to match against
  const students = await findUsers({
    role: 'STUDENT',
    grade: grade ? parseInt(grade) : undefined,
    class: className as string | undefined,
  });
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const parts = line.split(',').map((p: string) => p.trim());
    
    if (parts.length < 2) {
      results.push({
        line: i + 1,
        name: line,
        status: 'error',
        error: 'Invalid format. Expected: Name, Lexile'
      });
      continue;
    }
    
    const studentName = parts[0];
    const lexileValue = parseInt(parts[1]);
    
    if (isNaN(lexileValue) || lexileValue < 0 || lexileValue > 2000) {
      results.push({
        line: i + 1,
        name: studentName,
        status: 'error',
        error: 'Invalid lexile value. Must be a number between 0 and 2000'
      });
      continue;
    }
    
    // Find matching student by name (case-insensitive partial match)
    const matchingStudents = students.filter(s => 
      s.name.toLowerCase().includes(studentName.toLowerCase()) ||
      studentName.toLowerCase().includes(s.name.toLowerCase())
    );
    
    if (matchingStudents.length === 0) {
      results.push({
        line: i + 1,
        name: studentName,
        status: 'error',
        error: 'No matching student found'
      });
      continue;
    }
    
    if (matchingStudents.length > 1) {
      // Try exact match first
      const exactMatch = matchingStudents.find(s => 
        s.name.toLowerCase() === studentName.toLowerCase()
      );
      
      if (!exactMatch) {
        results.push({
          line: i + 1,
          name: studentName,
          status: 'error',
          error: `Multiple students found: ${matchingStudents.map(s => s.name).join(', ')}`
        });
        continue;
      }
      
      matchingStudents.length = 0;
      matchingStudents.push(exactMatch);
    }
    
    const student = matchingStudents[0];
    
    try {
      await upsertStudentLexile({
        userId: student.id,
        term: parseInt(term),
        year: parseInt(year),
        lexile: lexileValue
      });
      
      results.push({
        line: i + 1,
        name: studentName,
        status: 'success',
        lexile: lexileValue
      });
    } catch (error) {
      results.push({
        line: i + 1,
        name: studentName,
        status: 'error',
        error: 'Failed to save lexile record'
      });
    }
  }
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  res.json({
    summary: {
      total: results.length,
      success: successCount,
      errors: errorCount
    },
    results
  });
}));

/**
 * GET /api/lexile/class
 * Get lexile overview for a grade/class
 */
router.get('/class', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { grade, className, year } = req.query;
  
  // Students cannot access class-wide data
  if (user.role === 'STUDENT') {
    throw new AppError('Access denied', 403);
  }
  
  const { term: currentTerm, year: currentYear } = getCurrentTermAndYear();
  const targetYear = year ? parseInt(year as string) : currentYear;
  
  // Build student filter
  const studentFilter: any = { role: 'STUDENT' };
  
  // Teachers can only see their own class
  if (user.role === 'TEACHER') {
    studentFilter.grade = user.grade;
    studentFilter.class = user.class;
  } else {
    // Librarians can filter
    if (grade) studentFilter.grade = parseInt(grade as string);
    if (className) studentFilter.class = className as string;
  }
  
  // Get all students matching the filter with their lexile records
  const students = await findUsersWithLexiles(
    studentFilter,
    { year: targetYear }
  );
  
  // Transform data for easier frontend consumption
  const studentsWithLexiles = students.map(student => {
    const term1 = student.studentLexiles.find(l => l.term === 1)?.lexile ?? null;
    const term2 = student.studentLexiles.find(l => l.term === 2)?.lexile ?? null;
    const term3 = student.studentLexiles.find(l => l.term === 3)?.lexile ?? null;
    
    // Calculate trends
    let trend12: number | null = null;
    let trend23: number | null = null;
    
    if (term1 !== null && term2 !== null) {
      trend12 = term2 - term1;
    }
    if (term2 !== null && term3 !== null) {
      trend23 = term3 - term2;
    }
    
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      class: student.class,
      term1,
      term2,
      term3,
      trend12,
      trend23,
      currentLexile: term3 ?? term2 ?? term1
    };
  });
  
  res.json({
    students: studentsWithLexiles,
    year: targetYear,
    currentTerm
  });
}));

export default router;
