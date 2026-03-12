import { useState, useEffect, useMemo } from 'react';
import { BookOpen, LogOut, Megaphone, Settings, BarChart3, Library, Cog, Award, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookLogTable } from '@/components/BookLogTable';
import { AddBookModal } from '../student/AddBookModal';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CommentModal } from '../teacher/CommentModal';
import { LibraryManagementModal } from '@/components/LibraryManagementModal';
import { ApproveBookModal } from '@/components/ApproveBookModal';
import { useSearchParams } from 'react-router-dom';
import { MILESTONES } from '@/lib/reading-tiers';
import { LexileManagementContent } from './LexileManagement';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen as BookIcon } from 'lucide-react';

const VALID_TABS = ['books', 'verification', 'announcements', 'lexile', 'certificates', 'analytics', 'management'];

export const LibrarianDashboard = () => {
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam ?? '') ? tabParam! : 'books';

  const setActiveTab = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'books') next.delete('tab');
      else next.set('tab', value);
      return next;
    });
  };
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [pendingBooks, setPendingBooks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [approvingBook, setApprovingBook] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState<string | null>(null);
  // Analytics: students per tier
  const [analyticsGroupBy, setAnalyticsGroupBy] = useState<'school' | 'grade' | 'class'>('school');
  const [analyticsTierFilter, setAnalyticsTierFilter] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    groups: { name: string; tierCounts: Record<string, number>; total: number }[];
    tierNames: string[];
    tierKeys: string[];
    students?: {
      id: string;
      name: string;
      surname: string | null;
      grade: number | null;
      class: string | null;
      points: number;
      tierKey: string;
      tierName: string;
      tierDates?: Record<string, string | null>;
    }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
    surname: string | null;
    grade: number | null;
    class: string | null;
    points: number;
    tierKey: string;
    tierName: string;
    tierDates?: Record<string, string | null>;
  } | null>(null);

  const analyticsTierColumns = useMemo(
    () => [
      { key: 'starter', name: 'Starter', threshold: 0 },
      ...MILESTONES.map((m) => ({
        key: m.key,
        name: m.name,
        threshold: m.threshold,
      })),
    ],
    [],
  );

  const [analyticsView, setAnalyticsView] = useState<'students' | 'progression'>('students');
  const [analyticsStudentSearch, setAnalyticsStudentSearch] = useState('');
  const [analyticsSort, setAnalyticsSort] = useState<{
    key: 'name' | 'gradeClass' | 'tier' | 'points';
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const filteredAnalyticsStudents = useMemo(() => {
    if (!analyticsData || !analyticsData.students) return [];
    const term = analyticsStudentSearch.trim().toLowerCase();
    let students = analyticsData.students;

    if (term) {
      students = students.filter((s) => {
        const fullName = `${s.name} ${s.surname ?? ''}`.toLowerCase();
        return fullName.includes(term);
      });
    }

    const tierOrder = new Map<string, number>();
    analyticsTierColumns.forEach((t, index) => {
      tierOrder.set(t.key, index);
    });

    const sorted = [...students].sort((a, b) => {
      let cmp = 0;
      switch (analyticsSort.key) {
        case 'name': {
          const nameA = `${a.name} ${a.surname ?? ''}`.toLowerCase();
          const nameB = `${b.name} ${b.surname ?? ''}`.toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case 'gradeClass': {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          if (gradeA !== gradeB) {
            cmp = gradeA - gradeB;
          } else {
            const classA = (a.class ?? '').toString();
            const classB = (b.class ?? '').toString();
            cmp = classA.localeCompare(classB);
          }
          break;
        }
        case 'tier': {
          const orderA = tierOrder.get(a.tierKey) ?? 0;
          const orderB = tierOrder.get(b.tierKey) ?? 0;
          cmp = orderA - orderB;
          break;
        }
        case 'points': {
          cmp = a.points - b.points;
          break;
        }
      }
      return analyticsSort.direction === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [analyticsData, analyticsStudentSearch, analyticsTierColumns, analyticsSort]);

  const handleAnalyticsSort = (key: 'name' | 'gradeClass' | 'tier' | 'points') => {
    setAnalyticsSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Announcement management
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, filterGrade, filterClass]);

  // Fetch analytics (students per tier) when groupBy or tier filter changes
  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    const params = new URLSearchParams({ groupBy: analyticsGroupBy });
    if (analyticsTierFilter) params.set('tier', analyticsTierFilter);
    api.get(`/api/analytics/tier-breakdown?${params}`)
      .then((res) => {
        if (!cancelled) {
          const data = {
            ...res.data,
            students: Array.isArray(res.data.students) ? res.data.students : [],
          };
          setAnalyticsData(data);
          setAnalyticsError(null);
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          const message =
            (error.response?.data && typeof error.response.data.message === 'string'
              ? error.response.data.message
              : error.message) || 'Failed to load analytics';
          setAnalyticsError(message);
          setAnalyticsData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => { cancelled = true; };
  }, [analyticsGroupBy, analyticsTierFilter]);

  const fetchData = async () => {
    try {
      const [booksRes, pendingRes, announcementsRes] = await Promise.all([
        api.get('/api/books'),
        api.get('/api/books', { params: { status: 'PENDING' } }),
        api.get('/api/announcements'),
      ]);

      setBooks(booksRes.data);
      setFilteredBooks(booksRes.data);
      setPendingBooks(pendingRes.data);
      setAnnouncements(announcementsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = [...books];

    if (searchTerm) {
      filtered = filtered.filter(
        (book: any) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterGrade) {
      filtered = filtered.filter((book: any) => book.user.grade === parseInt(filterGrade));
    }

    if (filterClass) {
      filtered = filtered.filter((book: any) => book.user.class === filterClass);
    }

    setFilteredBooks(filtered);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;

    setSubmittingAnnouncement(true);
    try {
      await api.post('/api/announcements', { message: newAnnouncement });
      setNewAnnouncement('');
      fetchData();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await api.delete(`/api/announcements/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const handleVerifyBook = async (bookId: string, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED') {
      // Find the book and show approval modal
      const book = pendingBooks.find((b: any) => b.id === bookId) || books.find((b: any) => b.id === bookId);
      if (book) {
        setApprovingBook(book);
      }
    } else {
      // Rejection flow - keep existing prompt behavior
      try {
        const reason = window.prompt('Please provide feedback for the student before rejecting this book.');
        if (reason === null || !reason.trim()) {
          alert('Feedback is required to reject a book.');
          return;
        }

        await api.patch(`/api/books/${bookId}/verification`, {
          status: 'REJECTED',
          note: reason.trim(),
        });
        await fetchData();
      } catch (error) {
        console.error('Error updating verification status:', error);
        alert('Failed to update verification status. Please try again.');
      }
    }
  };

  const handleBookApproved = async () => {
    await fetchData();
    setApprovingBook(null);
  };

  const handleEditBook = (book: any) => {
    setEditingBook(book);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingBook(null);
  };

  const handleBookUpdated = async () => {
    await fetchData();
    handleEditModalClose();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const avgRating = books.length > 0
    ? (books.reduce((sum: number, b: any) => sum + b.rating, 0) / books.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-buttonHover">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Librarian Dashboard
              </h1>
              <p className="text-white/90 mt-1 font-medium">School-wide Management</p>
            </div>
            <Button variant="secondary" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AnnouncementBanner announcements={announcements} />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{books.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingBooks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                {new Set(books.map((b: any) => b.userId)).size}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{avgRating}⭐</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center gap-2">
            <TabsList className="flex flex-1 flex-wrap">
              <TabsTrigger value="books">All Books</TabsTrigger>
              <TabsTrigger value="verification">
                Verification Queue
                {pendingBooks.length > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
                    {pendingBooks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="lexile">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Lexile Levels
              </TabsTrigger>
              <TabsTrigger value="certificates">
                <Award className="w-4 h-4 mr-1.5" />
                Certificates
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart2 className="w-4 h-4 mr-1.5" />
                Analytics
              </TabsTrigger>
              <div className="flex-1" />
              <TabsTrigger value="management">
                <Library className="w-4 h-4 mr-1.5" />
                Library Management
                <Cog className="w-3 h-3 ml-1 opacity-80" aria-hidden />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="books">
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Search
                    </label>
                    <Input
                      placeholder="Search by title, author, or student..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Grade
                    </label>
                    <select
                      className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                    >
                      <option value="">All Grades</option>
                      {[3, 4, 5, 6, 7].map((grade) => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Class
                    </label>
                    <select
                      className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                    >
                      <option value="">All Classes</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Book Logs */}
            <div>
              <h2 className="text-2xl font-bold mb-4">All Reading Logs</h2>
              <BookLogTable
                books={filteredBooks}
                onCommentClick={setSelectedBook}
                onBookEdit={handleEditBook}
                showStudent={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Pending Verification</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingBooks.length === 0 ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
                    All caught up! There are no books waiting for review.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="p-4 text-left font-semibold">Title</th>
                          <th className="p-4 text-left font-semibold">Student</th>
                          <th className="p-4 text-left font-semibold">Student Lexile</th>
                          <th className="p-4 text-left font-semibold">Book Lexile</th>
                          <th className="p-4 text-left font-semibold">Submitted</th>
                          <th className="p-4 text-left font-semibold">Rating</th>
                          <th className="p-4 text-left font-semibold">Reflection</th>
                          <th className="p-4 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingBooks.map((book: any) => (
                          <tr key={book.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 align-top">
                              <div>
                                <p className="font-semibold">{book.title}</p>
                                <p className="text-xs text-muted-foreground">{book.author}</p>
                              </div>
                            </td>
                            <td className="p-4 align-top">
                              <div>
                                <p className="text-sm font-medium">{book.user?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {book.user?.grade
                                    ? `Grade ${book.user.grade}${book.user?.class ?? ''}`
                                    : 'No class assigned'}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 align-top text-sm">
                              {book.user?.currentLexile != null ? `${book.user.currentLexile}L` : '-'}
                            </td>
                            <td className="p-4 align-top text-sm">
                              {book.lexileLevel != null ? `${book.lexileLevel}L` : '-'}
                            </td>
                            <td className="p-4 align-top text-sm">
                              {new Date(book.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 align-top text-sm">
                              {book.rating} / 5
                            </td>
                            <td className="p-4 align-top text-sm max-w-xs">
                              <p className="line-clamp-3">
                                {book.comment || 'No reflection provided.'}
                              </p>
                            </td>
                            <td className="p-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleVerifyBook(book.id, 'APPROVED')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleVerifyBook(book.id, 'REJECTED')}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedBook(book.id)}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleEditBook(book)}
                                >
                                  Edit Book
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Create New Announcement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAnnouncement}>
                  <textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Write an announcement for all students..."
                  className="w-full min-h-[100px] rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/30 mb-4"
                  />
                  <Button type="submit" disabled={submittingAnnouncement || !newAnnouncement.trim()}>
                    {submittingAnnouncement ? 'Publishing...' : 'Publish Announcement'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">Recent Announcements</h3>
              {announcements.map((announcement: any) => (
                <Card key={announcement.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm">{announcement.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(announcement.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lexile">
            <LexileManagementContent />
          </TabsContent>

          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Reading Tier Certificates
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  All available certificates students can unlock by reaching reading tier thresholds. Click a certificate to view it full size.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {MILESTONES.map((milestone) => {
                    const filename = milestone.name === 'Beginner' ? 'Beginner.png' : `${milestone.name.toLowerCase()}.png`;
                    return (
                      <button
                        key={milestone.key}
                        type="button"
                        onClick={() => setCertificatePreviewUrl(`/images/certificates/${filename}`)}
                        className={`
                          relative rounded-xl border-2 overflow-hidden transition-all text-left
                          hover:shadow-lg hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                          ${milestone.circleBg} ${milestone.circleBorder}
                        `}
                        aria-label={`View ${milestone.name} certificate`}
                      >
                        <div className="aspect-[3/4] flex items-center justify-center p-4">
                          <img
                            src={`/images/certificates/${filename}`}
                            alt={`${milestone.name} certificate`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="p-2 text-center border-t bg-background/80">
                          <span className="font-semibold text-sm">{milestone.name}</span>
                          <span className="block text-xs text-muted-foreground">{milestone.threshold} pts</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5" />
                  Students per Tier
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  View student counts by reading tier. Filter by tier to see only that tier, or view all tiers. Group by school, grade, or class.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tier filter: tier images */}
                <div>
                  <label className="block text-sm font-medium mb-2">Filter by tier</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAnalyticsTierFilter(null)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        analyticsTierFilter === null
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 border-muted hover:bg-muted'
                      }`}
                      aria-pressed={analyticsTierFilter === null}
                    >
                      All tiers
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsTierFilter('starter')}
                      className={`flex items-center gap-2 rounded-xl border-2 border-gray-400 bg-gray-100 px-3 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        analyticsTierFilter === 'starter'
                          ? 'ring-2 ring-ring ring-offset-2'
                          : 'hover:bg-gray-200'
                      }`}
                      aria-pressed={analyticsTierFilter === 'starter'}
                      title="Starter (below first tier)"
                    >
                      <span className="text-base opacity-80">○</span>
                      Starter
                    </button>
                    {MILESTONES.map((milestone) => {
                      const isSelected = analyticsTierFilter === milestone.key;
                      return (
                        <button
                          key={milestone.key}
                          type="button"
                          onClick={() => setAnalyticsTierFilter(isSelected ? null : milestone.key)}
                          className={`flex items-center gap-2 rounded-xl border-2 overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            isSelected
                              ? 'ring-2 ring-ring ring-offset-2 ' + milestone.circleBorder
                              : 'hover:shadow-md ' + milestone.circleBorder
                          } ${milestone.circleBg}`}
                          aria-pressed={isSelected}
                          title={`${milestone.name} (${milestone.threshold}+ pts)`}
                        >
                          <img
                            src={`/images/tiers/${milestone.key}.png`}
                            alt=""
                            className="w-8 h-8 object-contain object-center"
                            aria-hidden
                          />
                          <span className="pr-2 text-sm font-medium">{milestone.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group by: School / Grade / Class */}
                <div>
                  <label className="block text-sm font-medium mb-2">View by</label>
                  <Tabs
                    value={analyticsGroupBy}
                    onValueChange={(v) => setAnalyticsGroupBy(v as 'school' | 'grade' | 'class')}
                    className="w-full"
                  >
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                      <TabsTrigger value="school">School</TabsTrigger>
                      <TabsTrigger value="grade">Grade</TabsTrigger>
                      <TabsTrigger value="class">Class</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Analytics view tabs */}
                <div>
                  <Tabs
                    value={analyticsView}
                    onValueChange={(v) => setAnalyticsView(v as 'students' | 'progression')}
                    className="w-full"
                  >
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="students">Students per Tier</TabsTrigger>
                      <TabsTrigger value="progression">Tier progression</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Students per Tier view */}
                <div className="space-y-3">
                  {analyticsView === 'students' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1">Students</label>
                          <p className="text-xs text-muted-foreground">
                            Click a student to view detailed reading stats.
                          </p>
                        </div>
                        <div className="w-full sm:w-64">
                          <label className="block text-xs font-medium mb-1">
                            Search by name
                          </label>
                          <Input
                            placeholder="Start typing a student name..."
                            value={analyticsStudentSearch}
                            onChange={(e) => setAnalyticsStudentSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      {analyticsLoading ? (
                        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
                          Loading students…
                        </div>
                      ) : analyticsError ? (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
                          Failed to load students: {analyticsError}
                        </div>
                      ) : filteredAnalyticsStudents.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th
                                  className="p-3 text-left font-semibold cursor-pointer select-none"
                                  onClick={() => handleAnalyticsSort('name')}
                                >
                                  Student
                                  {analyticsSort.key === 'name' &&
                                    (analyticsSort.direction === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                  className="p-3 text-left font-semibold cursor-pointer select-none"
                                  onClick={() => handleAnalyticsSort('gradeClass')}
                                >
                                  Grade / Class
                                  {analyticsSort.key === 'gradeClass' &&
                                    (analyticsSort.direction === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer select-none"
                                  onClick={() => handleAnalyticsSort('tier')}
                                >
                                  Tier
                                  {analyticsSort.key === 'tier' &&
                                    (analyticsSort.direction === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer select-none"
                                  onClick={() => handleAnalyticsSort('points')}
                                >
                                  Points
                                  {analyticsSort.key === 'points' &&
                                    (analyticsSort.direction === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAnalyticsStudents.map((s) => (
                                <tr
                                  key={s.id}
                                  className="border-b hover:bg-muted/30 cursor-pointer"
                                  onClick={() => setSelectedStudent(s)}
                                >
                                  <td className="p-3 font-medium">
                                    {s.name}
                                    {s.surname ? ` ${s.surname}` : ''}
                                  </td>
                                  <td className="p-3">
                                    {s.grade != null ? `Grade ${s.grade}` : 'No grade'}
                                    {s.class ? ` • ${s.class}` : ''}
                                  </td>
                                  <td className="p-3 text-center">{s.tierName}</td>
                                  <td className="p-3 text-center">{s.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
                          No students found for the current filters or search.
                        </div>
                      )}
                    </>
                  )}

                  {/* Tier progression view */}
                  {analyticsView === 'progression' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1">
                            Tier progression
                          </label>
                          <p className="text-xs text-muted-foreground">
                            See which tiers each student has reached over time.
                          </p>
                        </div>
                        <div className="w-full sm:w-64">
                          <label className="block text-xs font-medium mb-1">
                            Search by name
                          </label>
                          <Input
                            placeholder="Start typing a student name..."
                            value={analyticsStudentSearch}
                            onChange={(e) => setAnalyticsStudentSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      {analyticsLoading ? (
                        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
                          Loading tier progression…
                        </div>
                      ) : analyticsError ? (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
                          Failed to load tier progression: {analyticsError}
                        </div>
                      ) : filteredAnalyticsStudents.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th
                                  className="p-3 text-left font-semibold cursor-pointer select-none"
                                  onClick={() => handleAnalyticsSort('name')}
                                >
                                  Student
                                  {analyticsSort.key === 'name' &&
                                    (analyticsSort.direction === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                  className="p-3 text-left font-semibold cursor-pointer select-none"
                                  onClick={() => handleAnalyticsSort('gradeClass')}
                                >
                                  Grade / Class
                                  {analyticsSort.key === 'gradeClass' &&
                                    (analyticsSort.direction === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                {analyticsTierColumns.map((tier) => (
                                  <th key={tier.key} className="p-3 text-center font-semibold">
                                    {tier.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAnalyticsStudents.map((s) => (
                                <tr
                                  key={s.id}
                                  className="border-b hover:bg-muted/30 cursor-pointer"
                                  onClick={() => setSelectedStudent(s)}
                                >
                                  <td className="p-3 font-medium whitespace-nowrap">
                                    {s.name}
                                    {s.surname ? ` ${s.surname}` : ''}
                                  </td>
                                  <td className="p-3 whitespace-nowrap">
                                    {s.grade != null ? `Grade ${s.grade}` : 'No grade'}
                                    {s.class ? ` • ${s.class}` : ''}
                                  </td>
                                  {analyticsTierColumns.map((tier) => {
                                    const achievedAtIso =
                                      s.tierDates && tier.key in s.tierDates
                                        ? s.tierDates[tier.key]
                                        : null;
                                    const achievedDate =
                                      achievedAtIso != null
                                        ? new Date(achievedAtIso).toLocaleDateString()
                                        : null;
                                    const reached =
                                      tier.key === 'starter'
                                        ? s.points >= 0
                                        : s.points >= tier.threshold;
                                    const isCurrent = s.tierKey === tier.key;
                                    return (
                                      <td
                                        key={tier.key}
                                        className="p-3 text-center align-middle"
                                      >
                                        {reached ? (
                                          <div className="flex flex-col items-center gap-1">
                                            <span
                                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                                                isCurrent
                                                  ? 'bg-primary text-primary-foreground'
                                                  : 'bg-emerald-100 text-emerald-700'
                                              }`}
                                            >
                                              ✓
                                            </span>
                                            {achievedDate && (
                                              <span className="text-[10px] text-muted-foreground">
                                                {achievedDate}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground/60">–</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
                          No students found for the current filters or search.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <LibraryManagementModal inline onDataChanged={fetchData} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Comment Modal */}
      {selectedBook && (
        <CommentModal
          bookId={selectedBook}
          onClose={() => setSelectedBook(null)}
          onCommentAdded={fetchData}
        />
      )}

      <AddBookModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        onSaved={handleBookUpdated}
        book={editingBook}
      />

      <ApproveBookModal
        book={approvingBook}
        isOpen={!!approvingBook}
        onClose={() => setApprovingBook(null)}
        onApproved={handleBookApproved}
      />

      {/* Student analytics detail modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      {/* Full-size certificate preview */}
      <AnimatePresence>
        {certificatePreviewUrl && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[60]"
              onClick={() => setCertificatePreviewUrl(null)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 z-[70] flex items-center justify-center p-4"
              onClick={() => setCertificatePreviewUrl(null)}
            >
              <img
                src={certificatePreviewUrl}
                alt="Certificate full size"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StudentDetailModalProps {
  student: {
    id: string;
    name: string;
    surname: string | null;
    grade: number | null;
    class: string | null;
    points: number;
    tierKey: string;
    tierName: string;
  } | null;
  onClose: () => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalBooks: number;
    totalPoints: number;
    totalWords: number;
    avgLexile: number;
  } | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [currentLexile, setCurrentLexile] = useState<number | null>(null);

  useEffect(() => {
    if (!student) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, booksRes, lexileRes] = await Promise.all([
          api.get(`/api/users/${student.id}/stats`),
          api.get('/api/books', {
            params: { userId: student.id, status: 'APPROVED', sortBy: 'createdAt', order: 'desc' },
          }),
          api.get(`/api/lexile/student/${student.id}`),
        ]);
        if (cancelled) return;
        setStats(statsRes.data);
        setBooks(booksRes.data);
        setCurrentLexile(
          typeof lexileRes.data?.currentLexile === 'number'
            ? lexileRes.data.currentLexile
            : null,
        );
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err.response?.data?.message ||
            'Failed to load student details. Please try again.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [student]);

  if (!student) return null;

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-primary/10 shadow-2xl">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex flex-wrap items-baseline gap-3">
                    <span>
                      {student.name}
                      {student.surname ? ` ${student.surname}` : ''}
                    </span>
                    {currentLexile != null && (
                      <span className="text-base font-semibold text-primary">
                        Lexile: {currentLexile}L
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.grade != null ? `Grade ${student.grade}` : 'No grade'}
                    {student.class ? ` • ${student.class}` : ''}
                    {' • '}
                    Tier: <span className="font-semibold">{student.tierName}</span>
                    {' • '}
                    Points: <span className="font-semibold">{student.points}</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {loading ? (
                <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
                  Loading student details…
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : (
                <>
                  {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Approved books
                        </p>
                        <p className="text-2xl font-bold">{stats.totalBooks}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Total points
                        </p>
                        <p className="text-2xl font-bold">{stats.totalPoints}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Total words read
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.totalWords.toLocaleString()}
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Avg. book Lexile
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.avgLexile ? `${stats.avgLexile}L` : '—'}
                        </p>
                      </Card>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BookIcon className="w-4 h-4 text-primary" />
                      <h3 className="text-lg font-semibold">Books read</h3>
                    </div>
                    {books.length === 0 ? (
                      <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
                        No approved books found for this student yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="p-3 text-left font-semibold">Title</th>
                              <th className="p-3 text-left font-semibold">Author</th>
                              <th className="p-3 text-center font-semibold">Rating</th>
                              <th className="p-3 text-center font-semibold">Lexile</th>
                              <th className="p-3 text-center font-semibold">Points</th>
                              <th className="p-3 text-center font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {books.map((book) => {
                              const pointsForBook =
                                book.pointsAwarded && typeof book.pointsAwardedValue === 'number'
                                  ? book.pointsAwardedValue
                                  : 0;
                              return (
                                <tr key={book.id} className="border-b hover:bg-muted/30">
                                  <td className="p-3 font-medium">{book.title}</td>
                                  <td className="p-3">{book.author}</td>
                                  <td className="p-3 text-center">{book.rating}/5</td>
                                  <td className="p-3 text-center">
                                    {book.lexileLevel != null ? `${book.lexileLevel}L` : '—'}
                                  </td>
                                  <td className="p-3 text-center">{pointsForBook}</td>
                                  <td className="p-3 text-center">
                                    {book.createdAt
                                      ? new Date(book.createdAt).toLocaleDateString()
                                      : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

