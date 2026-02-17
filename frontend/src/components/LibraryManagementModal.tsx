import { useState, useEffect } from 'react';
import { X, Users, BookOpen, Plus, Trash2, Pencil, Upload } from 'lucide-react';
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

interface LibraryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const LibraryManagementModal: React.FC<LibraryManagementModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showBulkAddStudents, setShowBulkAddStudents] = useState(false);
  const [showBulkEditStudents, setShowBulkEditStudents] = useState(false);
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [bulkEditGrade, setBulkEditGrade] = useState('');
  const [bulkEditClass, setBulkEditClass] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [studentsForBook, setStudentsForBook] = useState<Student[]>([]);

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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchStudents(), fetchBooks()]).finally(() => setLoading(false));
    }
  }, [isOpen, filterGrade, filterClass]);

  useEffect(() => {
    if (showAddBook && isOpen) {
      api.get('/api/admin/students').then((res) => setStudentsForBook(res.data)).catch(() => {});
    }
  }, [showAddBook, isOpen]);

  const handleClose = () => {
    setSelectedStudentIds(new Set());
    setSelectedBookIds(new Set());
    setEditingStudent(null);
    setEditingBook(null);
    setShowAddStudent(false);
    setShowAddBook(false);
    setShowBulkAddStudents(false);
    setShowBulkEditStudents(false);
    setBulkStudentInput('');
    setBulkEditGrade('');
    setBulkEditClass('');
    onDataChanged?.();
    onClose();
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
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
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
    const grade = (form.elements.namedItem('studentGrade') as HTMLInputElement).value;
    const className = (form.elements.namedItem('studentClass') as HTMLInputElement).value;

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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to add student');
    } finally {
      setSubmitting(false);
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
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Library Management
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-4">
            <Tabs defaultValue="students" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="students" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Student Data
                </TabsTrigger>
                <TabsTrigger value="books" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Book Data
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
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
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
                            <select id="studentGrade" name="studentGrade" className="h-11 w-full rounded-xl border-2 border-input px-4">
                              <option value="">—</option>
                              {[3, 4, 5, 6, 7].map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="studentClass" className="block text-sm font-medium mb-1">Class</label>
                            <select id="studentClass" name="studentClass" className="h-11 w-full rounded-xl border-2 border-input px-4">
                              <option value="">—</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Student'}</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddStudent(false)}>Cancel</Button>
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
                          <select id="bulkEditGrade" className="h-11 rounded-xl border-2 border-input px-4" value={bulkEditGrade} onChange={(e) => setBulkEditGrade(e.target.value)}>
                            <option value="">—</option>
                            {[3, 4, 5, 6, 7].map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="bulkEditClass" className="block text-sm font-medium mb-1">Class</label>
                          <select id="bulkEditClass" className="h-11 rounded-xl border-2 border-input px-4" value={bulkEditClass} onChange={(e) => setBulkEditClass(e.target.value)}>
                            <option value="">—</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
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
                ) : students.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No students found</Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left">
                            <input type="checkbox" checked={selectedStudentIds.size === students.length} onChange={toggleAllStudents} aria-label="Select all" />
                          </th>
                          <th className="p-3 font-semibold">Name</th>
                          <th className="p-3 font-semibold">Email</th>
                          <th className="p-3 font-semibold">Grade</th>
                          <th className="p-3 font-semibold">Class</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
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
