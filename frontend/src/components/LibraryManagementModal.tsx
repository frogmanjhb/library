import { useState, useEffect } from 'react';
import { X, Users, BookOpen, Plus, Trash2, Pencil, Upload, UserPlus, KeyRound, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AddBookModal } from '../pages/student/AddBookModal';

interface Student {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  grade: number | null;
  class: string | null;
  lexileLevel?: number | null;
  createdAt?: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
  status: string;
  user: { id: string; name: string; email: string; grade?: number; class?: string };
}

interface Teacher {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  grade: number | null;
  class: string | null;
}

interface Librarian {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  grade?: number | null;
  class?: string | null;
}

interface LibraryManagementModalProps {
  /** When false, renders as a modal (requires isOpen and onClose). When true, renders inline under a tab. */
  inline?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onDataChanged?: () => void;
}

export const LibraryManagementModal: React.FC<LibraryManagementModalProps> = ({
  inline = false,
  isOpen = false,
  onClose,
  onDataChanged,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingLibrarian, setEditingLibrarian] = useState<Librarian | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showBulkAddStudents, setShowBulkAddStudents] = useState(false);
  const [showBulkEditStudents, setShowBulkEditStudents] = useState(false);
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [bulkEditGrade, setBulkEditGrade] = useState('');
  const [bulkEditClass, setBulkEditClass] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [studentsForBook, setStudentsForBook] = useState<Student[]>([]);
  const [addStudentGrade, setAddStudentGrade] = useState('');
  const [addStudentClass, setAddStudentClass] = useState('');

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [addTeacherGrade, setAddTeacherGrade] = useState('');
  const [addTeacherClass, setAddTeacherClass] = useState('');

  const [showAddLibrarian, setShowAddLibrarian] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [newLibrarianPassword, setNewLibrarianPassword] = useState('');
  const [confirmLibrarianPassword, setConfirmLibrarianPassword] = useState('');

  // Class codes by grade
  const CLASSES_BY_GRADE: Record<string, string[]> = {
    '3': ['3SC', '3SCA', '3TB'],
    '4': ['4KM', '4DA', '4KW'],
    '5': ['5EF', '5JS', '5AM'],
    '6': ['6A', '6B', '6C'],
    '7': ['7A', '7B', '7C'],
  };

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const visibleStudents = !normalizedStudentSearch
    ? students
    : students.filter((s) => {
        const fullName = `${s.name} ${s.surname ?? ''}`.trim().toLowerCase();
        const email = s.email.toLowerCase();
        return fullName.includes(normalizedStudentSearch) || email.includes(normalizedStudentSearch);
      });

  const fetchStudents = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterGrade) params.grade = filterGrade;
      if (filterClass) params.class = filterClass;
      const res = await api.get('/api/admin/students', { params });
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await api.get('/api/books');
      setBooks(res.data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/api/admin/teachers');
      setTeachers(res.data);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  };

  const fetchLibrarians = async () => {
    try {
      const res = await api.get('/api/admin/librarians');
      setLibrarians(res.data);
    } catch (err) {
      console.error('Failed to fetch librarians:', err);
    }
  };

  useEffect(() => {
    if (isOpen || inline) {
      setLoading(true);
      Promise.all([fetchStudents(), fetchBooks(), fetchTeachers(), fetchLibrarians()]).finally(() => setLoading(false));
    }
  }, [isOpen, inline, filterGrade, filterClass]);

  // Reset class filter when grade filter changes
  useEffect(() => {
    if (filterGrade && filterClass) {
      const classesForGrade = CLASSES_BY_GRADE[filterGrade] || [];
      if (!classesForGrade.includes(filterClass)) {
        setFilterClass('');
      }
    }
  }, [filterGrade, filterClass]);

  // Reset bulk edit class when grade changes
  useEffect(() => {
    if (bulkEditGrade && bulkEditClass) {
      const classesForGrade = CLASSES_BY_GRADE[bulkEditGrade] || [];
      if (!classesForGrade.includes(bulkEditClass)) {
        setBulkEditClass('');
      }
    }
  }, [bulkEditGrade, bulkEditClass]);

  useEffect(() => {
    if (showAddBook && (isOpen || inline)) {
      api.get('/api/admin/students').then((res) => setStudentsForBook(res.data)).catch(() => {});
    }
  }, [showAddBook, isOpen, inline]);

  const handleClose = () => {
    setSelectedStudentIds(new Set());
    setSelectedBookIds(new Set());
    setEditingStudent(null);
    setEditingBook(null);
    setEditingLibrarian(null);
    setEditingTeacher(null);
    setShowAddStudent(false);
    setShowAddBook(false);
    setShowBulkAddStudents(false);
    setShowBulkEditStudents(false);
    setBulkStudentInput('');
    setBulkEditGrade('');
    setBulkEditClass('');
    setAddStudentGrade('');
    setAddStudentClass('');
    setShowAddTeacher(false);
    setAddTeacherGrade('');
    setAddTeacherClass('');
    setShowAddLibrarian(false);
    setChangingPassword(false);
    setNewLibrarianPassword('');
    setConfirmLibrarianPassword('');
    onDataChanged?.();
    if (!inline) onClose?.();
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBookSelection = (id: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllStudents = () => {
    const visibleIds = visibleStudents.map((s) => s.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.has(id));
    if (allVisibleSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.add(id);
        return next;
      });
    }
  };

  const toggleAllBooks = () => {
    if (selectedBookIds.size === books.length) {
      setSelectedBookIds(new Set());
    } else {
      setSelectedBookIds(new Set(books.map((b) => b.id)));
    }
  };

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('studentName') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('studentEmail') as HTMLInputElement).value.trim().toLowerCase();
    const grade = addStudentGrade || (form.elements.namedItem('studentGrade') as HTMLSelectElement)?.value;
    const className = addStudentClass || (form.elements.namedItem('studentClass') as HTMLSelectElement)?.value;

    if (!name || !email) return;

    setSubmitting(true);
    try {
      await api.post('/api/admin/students', {
        name,
        email,
        grade: grade ? parseInt(grade, 10) : undefined,
        class: className || undefined,
      });
      await fetchStudents();
      setShowAddStudent(false);
      setAddStudentGrade('');
      setAddStudentClass('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const name = (form.elements.namedItem('teacherName') as HTMLInputElement).value.trim();
    const surname = (form.elements.namedItem('teacherSurname') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('teacherEmail') as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.elements.namedItem('teacherPassword') as HTMLInputElement).value;

    if (!name || !surname || !email || !password) return;
    if (!addTeacherGrade || !addTeacherClass) return;

    const gradeNum = parseInt(addTeacherGrade, 10);
    if (Number.isNaN(gradeNum)) return;

    setSubmitting(true);
    try {
      await api.post('/api/admin/teachers', {
        name,
        surname,
        grade: gradeNum,
        class: addTeacherClass,
        email,
        password,
      });
      await fetchTeachers();
      setShowAddTeacher(false);
      setAddTeacherGrade('');
      setAddTeacherClass('');
      form.reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const form = e.currentTarget;
    const name = (form.elements.namedItem('editTeacherName') as HTMLInputElement).value.trim();
    const surname = (form.elements.namedItem('editTeacherSurname') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('editTeacherEmail') as HTMLInputElement).value.trim().toLowerCase();
    const grade = (form.elements.namedItem('editTeacherGrade') as HTMLSelectElement).value;
    const className = (form.elements.namedItem('editTeacherClass') as HTMLSelectElement).value;

    if (!name || !surname || !email || !grade || !className) return;

    const gradeNum = parseInt(grade, 10);
    if (Number.isNaN(gradeNum)) return;

    setSubmitting(true);
    try {
      await api.put(`/api/admin/teachers/${editingTeacher.id}`, {
        name,
        surname,
        grade: gradeNum,
        class: className,
        email,
      });
      await fetchTeachers();
      setEditingTeacher(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      await api.delete(`/api/admin/teachers/${id}`);
      await fetchTeachers();
      if (editingTeacher?.id === id) setEditingTeacher(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to delete teacher');
    }
  };

  const handleAddLibrarian = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const name = (form.elements.namedItem('librarianName') as HTMLInputElement).value.trim();
    const surname = (form.elements.namedItem('librarianSurname') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('librarianEmail') as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.elements.namedItem('librarianPassword') as HTMLInputElement).value;

    if (!name || !surname || !email || !password) return;

    setSubmitting(true);
    try {
      await api.post('/api/admin/librarians', {
        name,
        surname,
        email,
        password,
      });
      await fetchLibrarians();
      setShowAddLibrarian(false);
      form.reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to add librarian');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLibrarian = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLibrarian) return;

    const form = e.currentTarget;
    const name = (form.elements.namedItem('editLibrarianName') as HTMLInputElement).value.trim();
    const surname = (form.elements.namedItem('editLibrarianSurname') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('editLibrarianEmail') as HTMLInputElement).value.trim().toLowerCase();

    if (!name || !surname || !email) return;

    setSubmitting(true);
    try {
      await api.put(`/api/admin/librarians/${editingLibrarian.id}`, {
        name,
        surname,
        email,
      });
      await fetchLibrarians();
      setEditingLibrarian(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update librarian');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLibrarianPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newLibrarianPassword || !confirmLibrarianPassword) return;
    if (newLibrarianPassword !== confirmLibrarianPassword) {
      alert('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/api/admin/librarians/password', {
        newPassword: newLibrarianPassword,
        confirmPassword: confirmLibrarianPassword,
      });
      setNewLibrarianPassword('');
      setConfirmLibrarianPassword('');
      alert('Password updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBulkAddStudents = async () => {
    const lines = bulkStudentInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const studentsToAdd = lines
      .map((line) => {
        const parts = line.split(/[,\t]/).map((p) => p.trim());
        const [name, email, gradeStr, classStr] = parts;
        if (!name || !email) return null;
        return {
          name,
          email: email.toLowerCase(),
          grade: gradeStr ? parseInt(gradeStr, 10) : undefined,
          class: classStr || undefined,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (studentsToAdd.length === 0) {
      alert('Enter at least one line as: name,email[,grade,class]');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/students', { students: studentsToAdd });
      const created = res.data?.created?.length ?? 0;
      const errors = res.data?.errors;
      if (errors?.length) {
        alert(`Added ${created}. Errors: ${errors.map((e: { email: string; message: string }) => `${e.email}: ${e.message}`).join('; ')}`);
      }
      await fetchStudents();
      setShowBulkAddStudents(false);
      setBulkStudentInput('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to add students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem('editStudentName') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('editStudentEmail') as HTMLInputElement).value.trim().toLowerCase();
    const grade = (form.elements.namedItem('editStudentGrade') as HTMLInputElement).value;
    const className = (form.elements.namedItem('editStudentClass') as HTMLInputElement).value;

    setSubmitting(true);
    try {
      await api.put(`/api/admin/students/${editingStudent.id}`, {
        name,
        email,
        grade: grade ? parseInt(grade, 10) : null,
        class: className || null,
      });
      await fetchStudents();
      setEditingStudent(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkEditStudents = async () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) {
      alert('Select at least one student');
      return;
    }
    const grade = bulkEditGrade ? parseInt(bulkEditGrade, 10) : undefined;
    const className = bulkEditClass || undefined;
    if (!grade && !className) {
      alert('Provide grade and/or class to update');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch('/api/admin/students/bulk', { ids, grade, class: className });
      await fetchStudents();
      setSelectedStudentIds(new Set());
      setShowBulkEditStudents(false);
      setBulkEditGrade('');
      setBulkEditClass('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Delete this student? This will remove all their book logs and points.')) return;
    try {
      await api.delete(`/api/admin/students/${id}`);
      await fetchStudents();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  const handleBulkDeleteStudents = async () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} student(s)? This will remove all their data.`)) return;
    try {
      await api.delete('/api/admin/students/bulk', { data: { ids } });
      await fetchStudents();
      setSelectedStudentIds(new Set());
    } catch (err) {
      alert('Failed to delete students');
    }
  };

  const handleLibrarianAddBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem('bookTitle') as HTMLInputElement).value.trim();
    const author = (form.elements.namedItem('bookAuthor') as HTMLInputElement).value.trim();
    const rating = parseInt((form.elements.namedItem('bookRating') as HTMLInputElement).value, 10);
    const userId = (form.elements.namedItem('bookUserId') as HTMLSelectElement).value;

    if (!title || !author || !userId) return;

    setSubmitting(true);
    try {
      await api.post('/api/books', { title, author, rating, userId });
      await fetchBooks();
      setShowAddBook(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to add book');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookSaved = async () => {
    await fetchBooks();
    setEditingBook(null);
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Delete this book log?')) return;
    try {
      await api.delete(`/api/books/${id}`);
      await fetchBooks();
    } catch (err) {
      alert('Failed to delete book');
    }
  };

  const handleBulkDeleteBooks = async () => {
    const ids = Array.from(selectedBookIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} book(s)?`)) return;
    try {
      await api.delete('/api/books/bulk', { data: { ids } });
      await fetchBooks();
      setSelectedBookIds(new Set());
    } catch (err) {
      alert('Failed to delete books');
    }
  };

  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Library Management
        </CardTitle>
        {!inline && (
          <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-4">
            <Tabs defaultValue="students" className="space-y-4">
              <TabsList className="grid w-full max-w-3xl grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="students" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Student Data
                </TabsTrigger>
                <TabsTrigger value="books" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Book Data
                </TabsTrigger>
                <TabsTrigger value="teachers" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Teacher Data
                </TabsTrigger>
                <TabsTrigger value="librarians" className="flex items-center gap-2">
                  <UserCog className="w-4 h-4" />
                  Librarian Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="students" className="space-y-4">
                {/* Student filters and actions */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label htmlFor="filterGrade" className="block text-sm font-medium mb-1 sr-only">
                      Grade
                    </label>
                    <select
                      id="filterGrade"
                      className="h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm"
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                    >
                      <option value="">All Grades</option>
                      {[3, 4, 5, 6, 7].map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="filterClass" className="block text-sm font-medium mb-1 sr-only">
                      Class
                    </label>
                    <select
                      id="filterClass"
                      className="h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm"
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                    >
                      <option value="">All Classes</option>
                      {filterGrade ? (
                        // Show classes for selected grade
                        (CLASSES_BY_GRADE[filterGrade] || []).map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))
                      ) : (
                        // Show all classes if no grade filter
                        Object.values(CLASSES_BY_GRADE).flat().map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="studentSearch" className="block text-sm font-medium mb-1 sr-only">
                      Search students
                    </label>
                    <Input
                      id="studentSearch"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name or email"
                      className="h-11 w-64 max-w-full rounded-xl"
                    />
                  </div>
                  <Button size="sm" onClick={() => setShowAddStudent(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Student
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowBulkAddStudents(true)}>
                    <Upload className="w-4 h-4 mr-1" />
                    Bulk Add
                  </Button>
                  {selectedStudentIds.size > 0 && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setShowBulkEditStudents(true)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Bulk Edit ({selectedStudentIds.size})
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleBulkDeleteStudents}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Bulk Delete ({selectedStudentIds.size})
                      </Button>
                    </>
                  )}
                </div>

                {/* Add student form */}
                {showAddStudent && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleAddStudent} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="studentName" className="block text-sm font-medium mb-1">Name</label>
                            <Input id="studentName" name="studentName" required placeholder="Student name" />
                          </div>
                          <div>
                            <label htmlFor="studentEmail" className="block text-sm font-medium mb-1">Email</label>
                            <Input id="studentEmail" name="studentEmail" type="email" required placeholder="name@stpeters.co.za" />
                          </div>
                          <div>
                            <label htmlFor="studentGrade" className="block text-sm font-medium mb-1">Grade</label>
                            <select 
                              id="studentGrade" 
                              name="studentGrade" 
                              value={addStudentGrade}
                              onChange={(e) => {
                                setAddStudentGrade(e.target.value);
                                setAddStudentClass(''); // Reset class when grade changes
                              }}
                              className="h-11 w-full rounded-xl border-2 border-input px-4"
                            >
                              <option value="">—</option>
                              {[3, 4, 5, 6, 7].map((g) => <option key={g} value={g.toString()}>Grade {g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="studentClass" className="block text-sm font-medium mb-1">Class</label>
                            <select 
                              id="studentClass" 
                              name="studentClass" 
                              value={addStudentClass}
                              onChange={(e) => setAddStudentClass(e.target.value)}
                              className="h-11 w-full rounded-xl border-2 border-input px-4 disabled:opacity-50"
                              disabled={!addStudentGrade}
                            >
                              <option value="">—</option>
                              {addStudentGrade && CLASSES_BY_GRADE[addStudentGrade]?.map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Student'}</Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowAddStudent(false);
                              setAddStudentGrade('');
                              setAddStudentClass('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Bulk add students */}
                {showBulkAddStudents && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        One per line: name,email,grade,class (grade and class optional)
                      </p>
                      <textarea
                        value={bulkStudentInput}
                        onChange={(e) => setBulkStudentInput(e.target.value)}
                        className="w-full min-h-[120px] rounded-xl border-2 border-input p-3 text-sm"
                        placeholder={'John Doe,john@stpeters.co.za,3,A\nJane Smith,jane@stpeters.co.za,4,B'}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button onClick={handleBulkAddStudents} disabled={submitting}>
                          {submitting ? 'Adding...' : 'Add Students'}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowBulkAddStudents(false); setBulkStudentInput(''); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bulk edit students */}
                {showBulkEditStudents && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm mb-3">Update grade/class for {selectedStudentIds.size} selected student(s)</p>
                      <div className="flex gap-4 items-end">
                        <div>
                          <label htmlFor="bulkEditGrade" className="block text-sm font-medium mb-1">Grade</label>
                          <select 
                            id="bulkEditGrade" 
                            className="h-11 rounded-xl border-2 border-input px-4" 
                            value={bulkEditGrade} 
                            onChange={(e) => {
                              setBulkEditGrade(e.target.value);
                              setBulkEditClass(''); // Reset class when grade changes
                            }}
                          >
                            <option value="">—</option>
                            {[3, 4, 5, 6, 7].map((g) => <option key={g} value={g.toString()}>Grade {g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="bulkEditClass" className="block text-sm font-medium mb-1">Class</label>
                          <select 
                            id="bulkEditClass" 
                            className="h-11 rounded-xl border-2 border-input px-4 disabled:opacity-50" 
                            value={bulkEditClass} 
                            onChange={(e) => setBulkEditClass(e.target.value)}
                            disabled={!bulkEditGrade}
                          >
                            <option value="">—</option>
                            {bulkEditGrade && CLASSES_BY_GRADE[bulkEditGrade]?.map((cls) => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                            {!bulkEditGrade && ['3SC', '3SCA', '3TB', '4KM', '4DA', '4KW', '5EF', '5JS', '5AM', '6A', '6B', '6C', '7A', '7B', '7C'].map((cls) => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                          </select>
                        </div>
                        <Button onClick={handleBulkEditStudents} disabled={submitting || (!bulkEditGrade && !bulkEditClass)}>
                          {submitting ? 'Updating...' : 'Update'}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowBulkEditStudents(false); setBulkEditGrade(''); setBulkEditClass(''); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Edit student form */}
                {editingStudent && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleUpdateStudent} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="editStudentName" className="block text-sm font-medium mb-1">Name</label>
                            <Input id="editStudentName" name="editStudentName" defaultValue={editingStudent.name} required />
                          </div>
                          <div>
                            <label htmlFor="editStudentEmail" className="block text-sm font-medium mb-1">Email</label>
                            <Input id="editStudentEmail" name="editStudentEmail" type="email" defaultValue={editingStudent.email} required />
                          </div>
                          <div>
                            <label htmlFor="editStudentGrade" className="block text-sm font-medium mb-1">Grade</label>
                            <select id="editStudentGrade" name="editStudentGrade" className="h-11 w-full rounded-xl border-2 border-input px-4" defaultValue={editingStudent.grade ?? ''}>
                              <option value="">—</option>
                              {[3, 4, 5, 6, 7].map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="editStudentClass" className="block text-sm font-medium mb-1">Class</label>
                            <select id="editStudentClass" name="editStudentClass" className="h-11 w-full rounded-xl border-2 border-input px-4" defaultValue={editingStudent.class ?? ''}>
                              <option value="">—</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>Save</Button>
                          <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Student table */}
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : visibleStudents.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    {students.length === 0 ? 'No students found' : 'No students match your search/filters'}
                  </Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                visibleStudents.length > 0 &&
                                visibleStudents.every((s) => selectedStudentIds.has(s.id))
                              }
                              onChange={toggleAllStudents}
                              aria-label="Select all visible"
                            />
                          </th>
                          <th className="p-3 font-semibold">Name</th>
                          <th className="p-3 font-semibold">Email</th>
                          <th className="p-3 font-semibold">Grade</th>
                          <th className="p-3 font-semibold">Class</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map((s) => (
                          <tr key={s.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <input type="checkbox" checked={selectedStudentIds.has(s.id)} onChange={() => toggleStudentSelection(s.id)} aria-label={`Select ${s.name}`} />
                            </td>
                            <td className="p-3">{s.name}</td>
                            <td className="p-3">{s.email}</td>
                            <td className="p-3">{s.grade ?? '—'}</td>
                            <td className="p-3">{s.class ?? '—'}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingStudent(s)} aria-label={`Edit ${s.name}`}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteStudent(s.id)} aria-label={`Delete ${s.name}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="teachers" className="space-y-4">
                <div className="flex flex-wrap gap-2 items-end">
                  <Button size="sm" onClick={() => { setShowAddTeacher(true); setEditingTeacher(null); }}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Teacher
                  </Button>
                </div>

                {showAddTeacher && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleAddTeacher} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="teacherName" className="block text-sm font-medium mb-1">Name</label>
                            <Input id="teacherName" name="teacherName" required placeholder="Teacher name" />
                          </div>
                          <div>
                            <label htmlFor="teacherSurname" className="block text-sm font-medium mb-1">Surname</label>
                            <Input id="teacherSurname" name="teacherSurname" required placeholder="Teacher surname" />
                          </div>
                          <div>
                            <label htmlFor="teacherEmail" className="block text-sm font-medium mb-1">Email</label>
                            <Input id="teacherEmail" name="teacherEmail" type="email" required placeholder="name@stpeters.co.za" />
                          </div>
                          <div>
                            <label htmlFor="teacherPassword" className="block text-sm font-medium mb-1">Password</label>
                            <Input id="teacherPassword" name="teacherPassword" type="password" required placeholder="Set a password" />
                          </div>
                          <div>
                            <label htmlFor="teacherGrade" className="block text-sm font-medium mb-1">Grade</label>
                            <select
                              id="teacherGrade"
                              name="teacherGrade"
                              value={addTeacherGrade}
                              onChange={(e) => {
                                setAddTeacherGrade(e.target.value);
                                setAddTeacherClass('');
                              }}
                              className="h-11 w-full rounded-xl border-2 border-input px-4"
                            >
                              <option value="">—</option>
                              {[3, 4, 5, 6, 7].map((g) => (
                                <option key={g} value={g.toString()}>Grade {g}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="teacherClass" className="block text-sm font-medium mb-1">Class</label>
                            <select
                              id="teacherClass"
                              name="teacherClass"
                              value={addTeacherClass}
                              onChange={(e) => setAddTeacherClass(e.target.value)}
                              className="h-11 w-full rounded-xl border-2 border-input px-4 disabled:opacity-50"
                              disabled={!addTeacherGrade}
                            >
                              <option value="">—</option>
                              {addTeacherGrade &&
                                (CLASSES_BY_GRADE[addTeacherGrade] || []).map((cls) => (
                                  <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>
                            {submitting ? 'Adding...' : 'Add Teacher'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowAddTeacher(false);
                              setAddTeacherGrade('');
                              setAddTeacherClass('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {editingTeacher && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleUpdateTeacher} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="editTeacherName" className="block text-sm font-medium mb-1">Name</label>
                            <Input id="editTeacherName" name="editTeacherName" defaultValue={editingTeacher.name} required />
                          </div>
                          <div>
                            <label htmlFor="editTeacherSurname" className="block text-sm font-medium mb-1">Surname</label>
                            <Input id="editTeacherSurname" name="editTeacherSurname" defaultValue={editingTeacher.surname ?? ''} required />
                          </div>
                          <div>
                            <label htmlFor="editTeacherEmail" className="block text-sm font-medium mb-1">Email</label>
                            <Input id="editTeacherEmail" name="editTeacherEmail" type="email" defaultValue={editingTeacher.email} required />
                          </div>
                          <div>
                            <label htmlFor="editTeacherGrade" className="block text-sm font-medium mb-1">Grade</label>
                            <select
                              id="editTeacherGrade"
                              name="editTeacherGrade"
                              className="h-11 w-full rounded-xl border-2 border-input px-4"
                              defaultValue={editingTeacher.grade ?? ''}
                            >
                              <option value="">—</option>
                              {[3, 4, 5, 6, 7].map((g) => (
                                <option key={g} value={g.toString()}>Grade {g}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label htmlFor="editTeacherClass" className="block text-sm font-medium mb-1">Class</label>
                            <select
                              id="editTeacherClass"
                              name="editTeacherClass"
                              className="h-11 w-full rounded-xl border-2 border-input px-4"
                              defaultValue={editingTeacher.class ?? ''}
                            >
                              <option value="">—</option>
                              {Object.values(CLASSES_BY_GRADE).flat().map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setEditingTeacher(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : teachers.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No teachers found</Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left font-semibold">Name</th>
                          <th className="p-3 text-left font-semibold">Email</th>
                          <th className="p-3 font-semibold">Grade</th>
                          <th className="p-3 font-semibold">Class</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((t) => (
                          <tr key={t.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              {t.name} {t.surname ?? ''}
                            </td>
                            <td className="p-3">{t.email}</td>
                            <td className="p-3">{t.grade ?? '—'}</td>
                            <td className="p-3">{t.class ?? '—'}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingTeacher(t);
                                    setShowAddTeacher(false);
                                  }}
                                  aria-label={`Edit ${t.name}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTeacher(t.id)}
                                  aria-label={`Delete ${t.name}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="librarians" className="space-y-4">
                <div className="flex flex-wrap gap-2 items-end">
                  <Button size="sm" onClick={() => { setShowAddLibrarian(true); setEditingLibrarian(null); }}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Librarian
                  </Button>
                </div>

                {showAddLibrarian && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleAddLibrarian} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="librarianName" className="block text-sm font-medium mb-1">Name</label>
                            <Input id="librarianName" name="librarianName" required placeholder="Librarian name" />
                          </div>
                          <div>
                            <label htmlFor="librarianSurname" className="block text-sm font-medium mb-1">Surname</label>
                            <Input id="librarianSurname" name="librarianSurname" required placeholder="Librarian surname" />
                          </div>
                          <div>
                            <label htmlFor="librarianEmail" className="block text-sm font-medium mb-1">Email</label>
                            <Input id="librarianEmail" name="librarianEmail" type="email" required placeholder="name@stpeters.co.za" />
                          </div>
                          <div>
                            <label htmlFor="librarianPassword" className="block text-sm font-medium mb-1">Password</label>
                            <Input id="librarianPassword" name="librarianPassword" type="password" required placeholder="Set a password" />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>
                            {submitting ? 'Adding...' : 'Add Librarian'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddLibrarian(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {editingLibrarian && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleUpdateLibrarian} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="editLibrarianName" className="block text-sm font-medium mb-1">Name</label>
                            <Input id="editLibrarianName" name="editLibrarianName" defaultValue={editingLibrarian.name} required />
                          </div>
                          <div>
                            <label htmlFor="editLibrarianSurname" className="block text-sm font-medium mb-1">Surname</label>
                            <Input id="editLibrarianSurname" name="editLibrarianSurname" defaultValue={editingLibrarian.surname ?? ''} required />
                          </div>
                          <div className="md:col-span-2">
                            <label htmlFor="editLibrarianEmail" className="block text-sm font-medium mb-1">Email</label>
                            <Input id="editLibrarianEmail" name="editLibrarianEmail" type="email" defaultValue={editingLibrarian.email} required />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setEditingLibrarian(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : librarians.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No librarians found</Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left font-semibold">Name</th>
                          <th className="p-3 text-left font-semibold">Email</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {librarians.map((l) => (
                          <tr key={l.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              {l.name} {l.surname ?? ''}
                            </td>
                            <td className="p-3">{l.email}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditingLibrarian(l); setShowAddLibrarian(false); }}
                                >
                                  <Pencil className="w-4 h-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5" />
                      Update Your Password
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Set a new password for your librarian account.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateLibrarianPassword} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="newLibrarianPassword" className="block text-sm font-medium mb-1">New Password</label>
                          <Input
                            id="newLibrarianPassword"
                            type="password"
                            value={newLibrarianPassword}
                            onChange={(e) => setNewLibrarianPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="confirmLibrarianPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
                          <Input
                            id="confirmLibrarianPassword"
                            type="password"
                            value={confirmLibrarianPassword}
                            onChange={(e) => setConfirmLibrarianPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={changingPassword}>
                          {changingPassword ? 'Updating...' : 'Update Password'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={changingPassword}
                          onClick={() => {
                            setNewLibrarianPassword('');
                            setConfirmLibrarianPassword('');
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="books" className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="sm" onClick={() => setShowAddBook(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Book
                  </Button>
                  {selectedBookIds.size > 0 && (
                    <Button size="sm" variant="destructive" onClick={handleBulkDeleteBooks}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedBookIds.size})
                    </Button>
                  )}
                </div>

                {showAddBook && (
                  <Card>
                    <CardContent className="pt-4">
                      <form onSubmit={handleLibrarianAddBook} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="bookUserId" className="block text-sm font-medium mb-1">Student</label>
                            <select id="bookUserId" name="bookUserId" required className="h-11 w-full rounded-xl border-2 border-input px-4">
                              <option value="">Select student</option>
                              {studentsForBook.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.email}) - Gr{s.grade ?? '?'}{s.class ?? ''}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="bookTitle" className="block text-sm font-medium mb-1">Title</label>
                            <Input id="bookTitle" name="bookTitle" required placeholder="Book title" />
                          </div>
                          <div>
                            <label htmlFor="bookAuthor" className="block text-sm font-medium mb-1">Author</label>
                            <Input id="bookAuthor" name="bookAuthor" required placeholder="Author" />
                          </div>
                          <div>
                            <label htmlFor="bookRating" className="block text-sm font-medium mb-1">Rating</label>
                            <select id="bookRating" name="bookRating" className="h-11 w-full rounded-xl border-2 border-input px-4" defaultValue="5">
                              {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Book'}</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddBook(false)}>Cancel</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : books.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No books found</Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left">
                            <input type="checkbox" checked={selectedBookIds.size === books.length} onChange={toggleAllBooks} aria-label="Select all" />
                          </th>
                          <th className="p-3 font-semibold">Title</th>
                          <th className="p-3 font-semibold">Author</th>
                          <th className="p-3 font-semibold">Student</th>
                          <th className="p-3 font-semibold">Status</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {books.map((b) => (
                          <tr key={b.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <input type="checkbox" checked={selectedBookIds.has(b.id)} onChange={() => toggleBookSelection(b.id)} aria-label={`Select ${b.title}`} />
                            </td>
                            <td className="p-3 font-medium">{b.title}</td>
                            <td className="p-3">{b.author}</td>
                            <td className="p-3">{b.user?.name ?? '—'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                b.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                b.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingBook(b)} aria-label={`Edit ${b.title}`}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteBook(b.id)} aria-label={`Delete ${b.title}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
      </CardContent>
    </>
  );

  if (inline) {
    return (
      <Card className="w-full max-w-5xl overflow-hidden flex flex-col border-2 border-primary/10 shadow-2xl">
        {cardContent}
      </Card>
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <Card
          className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-primary/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {cardContent}
        </Card>
      </motion.div>

      {/* Edit Book Modal */}
      <AddBookModal
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSaved={handleBookSaved}
        book={editingBook ?? null}
      />
    </AnimatePresence>
  );
};
