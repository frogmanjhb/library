import { useState, useEffect } from 'react';
import { BookOpen, Plus, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCard } from '@/components/BookCard';
import { PointsBadge } from '@/components/PointsBadge';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { Leaderboard } from '@/components/Leaderboard';
import { AddBookModal } from './AddBookModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
  comment?: string;
  lexileLevel?: number;
  wordCount?: number;
  coverUrl?: string;
  genres?: string[];
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationNote?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: {
    name: string;
    email: string;
  } | null;
}

export const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [announcements, setAnnouncements] = useState([]);
  const [points, setPoints] = useState(0);
  const [stats, setStats] = useState({ totalBooks: 0, totalWords: 0, avgLexile: 0 });
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [booksRes, announcementsRes, pointsRes, statsRes] = await Promise.all([
        api.get('/api/books'),
        api.get('/api/announcements'),
        api.get(`/api/points/${user?.id}`),
        api.get(`/api/users/${user?.id}/stats`),
      ]);

      setBooks(booksRes.data);
      setAnnouncements(announcementsRes.data);
      setPoints(pointsRes.data.totalPoints);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setShowAddBook(true);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setShowAddBook(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      await api.delete(`/api/books/${bookId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book');
    }
  };

  const handleBookSaved = () => {
    setShowAddBook(false);
    setEditingBook(null);
    fetchData();
  };

  const pendingCount = books.filter((b) => b.status === 'PENDING').length;
  const rejectedCount = books.filter((b) => b.status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                St Peter's Library
              </h1>
              <p className="text-blue-100 mt-1">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex items-center gap-4">
              <PointsBadge points={points} size="lg" />
              <Button variant="secondary" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AnnouncementBanner announcements={announcements} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Books Read
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalBooks}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Words
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-secondary">
                  {stats.totalWords.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Lexile Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.avgLexile}L
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mybooks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="mybooks">My Books</TabsTrigger>
            <TabsTrigger value="add">Add Book</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="mybooks">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">My Reading Log</h2>
              <Button onClick={handleAddBook}>
                <Plus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            </div>

            {(pendingCount > 0 || rejectedCount > 0) && (
              <div className="space-y-2 mb-4">
                {pendingCount > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    You have {pendingCount} book{pendingCount > 1 ? 's' : ''} awaiting librarian verification.
                    You will earn points once they are approved.
                  </div>
                )}
                {rejectedCount > 0 && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {rejectedCount} book{rejectedCount > 1 ? 's need' : ' needs'} updates based on librarian feedback.
                    Open the card to see notes and resubmit when ready.
                  </div>
                )}
              </div>
            )}

            {books.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No books yet!</h3>
                <p className="text-muted-foreground mb-4">
                  Start logging the books you've read to earn points once they are approved by the librarian.
                </p>
                <Button onClick={handleAddBook}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Your First Book
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onEdit={handleEditBook}
                    onDelete={handleDeleteBook}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Log a New Book</CardTitle>
              </CardHeader>
              <CardContent>
                <AddBookModal
                  isOpen={true}
                  onClose={() => {}}
                  onSaved={handleBookSaved}
                  book={null}
                  inline={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Book Modal */}
      {showAddBook && (
        <AddBookModal
          isOpen={showAddBook}
          onClose={() => {
            setShowAddBook(false);
            setEditingBook(null);
          }}
          onSaved={handleBookSaved}
          book={editingBook}
        />
      )}
    </div>
  );
};

