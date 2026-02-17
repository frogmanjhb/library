import { useState, useEffect } from 'react';
import { BookOpen, LogOut, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookLogTable } from '@/components/BookLogTable';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CommentModal } from './CommentModal';

export const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, filterRating]);

  const fetchData = async () => {
    try {
      const [booksRes, announcementsRes] = await Promise.all([
        api.get('/api/books'),
        api.get('/api/announcements'),
      ]);

      setBooks(booksRes.data);
      setFilteredBooks(booksRes.data);
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

    if (filterRating) {
      filtered = filtered.filter((book: any) => book.rating === parseInt(filterRating));
    }

    setFilteredBooks(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-buttonHover">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Teacher Dashboard
              </h1>
              <p className="text-white/90 mt-1 font-medium">
                {user?.name} • Grade {user?.grade}{user?.class}
              </p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Books Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{books.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Students
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
              <div className="text-3xl font-bold text-green-600">
                {books.length > 0
                  ? (books.reduce((sum: number, b: any) => sum + b.rating, 0) / books.length).toFixed(1)
                  : '0'}
                ⭐
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Filter by Rating
                </label>
                <select
                  className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Book Logs */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Student Reading Logs</h2>
          <BookLogTable
            books={filteredBooks}
            onCommentClick={setSelectedBook}
            showStudent={true}
          />
        </div>
      </main>

      {/* Comment Modal */}
      {selectedBook && (
        <CommentModal
          bookId={selectedBook}
          onClose={() => setSelectedBook(null)}
          onCommentAdded={fetchData}
        />
      )}
    </div>
  );
};

