import { useState, useEffect } from 'react';
import { BookOpen, LogOut, Megaphone, Settings, BarChart3, Library, Cog } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

export const LibrarianDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
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
  const [showLibraryManagement, setShowLibraryManagement] = useState(false);

  // Announcement management
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, filterGrade, filterClass]);

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
        <Tabs defaultValue="books" className="space-y-6">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Lexile Level Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage student Lexile levels, track progress across terms, and view trends.
                </p>
                <Button onClick={() => navigate('/librarian/lexile')}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Open Lexile Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Library className="w-5 h-5" />
                  <Cog className="w-4 h-4 opacity-80" />
                  Library Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage student data and book records. Add, edit, or delete students and books individually or in bulk.
                </p>
                <Button onClick={() => setShowLibraryManagement(true)}>
                  <Library className="w-4 h-4 mr-2" />
                  Open Library Management
                  <Cog className="w-3 h-3 ml-1.5 opacity-80" aria-hidden />
                </Button>
              </CardContent>
            </Card>
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

      <LibraryManagementModal
        isOpen={showLibraryManagement}
        onClose={() => setShowLibraryManagement(false)}
        onDataChanged={fetchData}
      />

      <ApproveBookModal
        book={approvingBook}
        isOpen={!!approvingBook}
        onClose={() => setApprovingBook(null)}
        onApproved={handleBookApproved}
      />
    </div>
  );
};

