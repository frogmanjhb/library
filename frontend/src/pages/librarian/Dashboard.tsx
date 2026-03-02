import { useState, useEffect } from 'react';
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
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
    const params = new URLSearchParams({ groupBy: analyticsGroupBy });
    if (analyticsTierFilter) params.set('tier', analyticsTierFilter);
    api.get(`/api/analytics/tier-breakdown?${params}`)
      .then((res) => {
        if (!cancelled) setAnalyticsData(res.data);
      })
      .catch(() => {
        if (!cancelled) setAnalyticsData({ groups: [], tierNames: [], tierKeys: [] });
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

                {/* Table: groups × tier counts */}
                <div>
                  <label className="block text-sm font-medium mb-2">Counts</label>
                  {analyticsLoading ? (
                    <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
                      Loading…
                    </div>
                  ) : analyticsData && analyticsData.groups.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-semibold">Group</th>
                            {analyticsData.tierNames.map((name, i) => (
                              <th key={analyticsData.tierKeys[i] ?? i} className="p-3 font-semibold text-center">
                                {name}
                              </th>
                            ))}
                            <th className="p-3 font-semibold text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.groups.map((row) => (
                            <tr key={row.name} className="border-b hover:bg-muted/30">
                              <td className="p-3 font-medium">{row.name}</td>
                              {analyticsData.tierKeys.map((key) => (
                                <td key={key} className="p-3 text-center">
                                  {row.tierCounts[key] ?? 0}
                                </td>
                              ))}
                              <td className="p-3 text-center font-medium">{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
                      No student data to show. Change filters or add students with points.
                    </div>
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

