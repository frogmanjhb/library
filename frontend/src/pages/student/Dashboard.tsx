import { useState, useEffect } from 'react';
import { BookOpen, Plus, LogOut, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookCard } from '@/components/BookCard';
import { PointsSystemPanel } from '@/components/PointsSystemPanel';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { AddBookModal } from './AddBookModal';
import { CertificateModal } from './CertificateModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getTierProgress } from '@/lib/reading-tiers';
import { motion } from 'framer-motion';

interface LexileRecord {
  id: string;
  term: number;
  year: number;
  lexile: number;
}

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
  const [showCertificates, setShowCertificates] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Lexile tracking state
  const [currentLexile, setCurrentLexile] = useState<number | null>(null);
  const [lexileRecords, setLexileRecords] = useState<LexileRecord[]>([]);
  const [currentTerm, setCurrentTerm] = useState<number>(1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [booksRes, announcementsRes, pointsRes, statsRes, lexileRes] = await Promise.all([
        api.get('/api/books'),
        api.get('/api/announcements'),
        api.get(`/api/points/${user?.id}`),
        api.get(`/api/users/${user?.id}/stats`),
        api.get(`/api/lexile/student/${user?.id}`).catch(() => ({ data: { records: [], currentLexile: null, currentTerm: 1, currentYear: new Date().getFullYear() } })),
      ]);

      setBooks(booksRes.data);
      setAnnouncements(announcementsRes.data);
      setPoints(pointsRes.data.totalPoints);
      setStats(statsRes.data);
      
      // Set lexile data
      setLexileRecords(lexileRes.data.records || []);
      setCurrentLexile(lexileRes.data.currentLexile);
      setCurrentTerm(lexileRes.data.currentTerm || 1);
      setCurrentYear(lexileRes.data.currentYear || new Date().getFullYear());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get lexile trend compared to previous term
  const getLexileTrend = () => {
    if (lexileRecords.length < 2) return null;
    
    const currentYearRecords = lexileRecords.filter(r => r.year === currentYear);
    if (currentYearRecords.length < 2) return null;
    
    // Sort by term descending
    const sorted = [...currentYearRecords].sort((a, b) => b.term - a.term);
    if (sorted.length < 2) return null;
    
    const latest = sorted[0].lexile;
    const previous = sorted[1].lexile;
    
    return latest - previous;
  };

  const lexileTrend = getLexileTrend();

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
  const tierProgress = getTierProgress(points);

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
                Pageforge
              </h1>
              <p className="text-white/90 mt-1 font-medium">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => setShowCertificates(true)}
                className="gap-2"
              >
                <Award className="w-4 h-4" />
                Certificate
              </Button>
              <Button variant="secondary" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        <AnnouncementBanner announcements={announcements} />

        {/* Stats Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Books Read
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">{stats.totalBooks}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Your Lexile Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl font-bold text-green-600">
                    {currentLexile ? `${currentLexile}L` : '-'}
                  </span>
                  {lexileTrend !== null && (
                    <span className={`flex items-center text-sm font-medium ${
                      lexileTrend > 0 ? 'text-emerald-600' : 
                      lexileTrend < 0 ? 'text-rose-600' : 'text-gray-500'
                    }`}>
                      {lexileTrend > 0 ? (
                        <><TrendingUp className="w-4 h-4 mr-1" />+{lexileTrend}</>
                      ) : lexileTrend < 0 ? (
                        <><TrendingDown className="w-4 h-4 mr-1" />{lexileTrend}</>
                      ) : (
                        <><Minus className="w-4 h-4 mr-1" />0</>
                      )}
                    </span>
                  )}
                </div>
                {currentLexile && (
                  <p className="text-xs text-muted-foreground">
                    Term {currentTerm}, {currentYear}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Avg Book Lexile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600">
                  {stats.avgLexile}L
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Reading XP and Add Book Section */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Reading XP Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">Reading XP</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="default"
                        className="text-3xl font-extrabold px-4 py-2 h-auto"
                      >
                        {tierProgress.tierName}
                      </Badge>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Progress value={tierProgress.progressInTier * 100} className="h-3" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {points.toLocaleString()} / {tierProgress.nextThreshold.toLocaleString()} pts
                        </span>
                        <span>{tierProgress.tierName}</span>
                      </div>
                    </div>
                    <div className="md:text-right">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Next unlock
                      </div>
                      <div className="text-sm font-semibold">
                        {tierProgress.nextTierName ?? (tierProgress.isMaxTier ? 'Max tier' : '—')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Add Book Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full lg:w-auto lg:min-w-[280px] flex items-stretch"
            >
              <Button
                onClick={handleAddBook}
                size="lg"
                className="w-full h-full min-h-[160px] text-xl lg:text-2xl font-extrabold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all py-10 px-12"
              >
                <Plus className="w-8 h-8 mr-3" />
                ADD BOOK
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Reading Tiers Card */}
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PointsSystemPanel currentPoints={points} showMaterialsOnly={true} />
          </motion.div>
        </div>

        {/* Reading Log */}
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Reading Log</h2>
          </div>

          {(pendingCount > 0 || rejectedCount > 0) && (
            <div className="space-y-2 mb-4">
              {pendingCount > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  You have {pendingCount} book{pendingCount > 1 ? 's' : ''} awaiting librarian verification.
                  You will earn points based on book difficulty (1-3 points) once approved.
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
                Your reading log will appear here once books are logged.
              </p>
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
                  studentLexile={currentLexile}
                />
              ))}
            </div>
          )}
        </div>
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
          studentLexile={currentLexile}
        />
      )}

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={showCertificates}
        onClose={() => setShowCertificates(false)}
        currentPoints={points}
      />
    </div>
  );
};

