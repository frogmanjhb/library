import { useState, useEffect } from 'react';
import { BookOpen, Plus, LogOut, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

  const totalWordsRead = stats.totalWords ?? 0;

  const badgeTiers = [
    {
      id: 'bronze',
      name: 'Bronze Bookworm',
      wordsRequired: 100000,
      imageSrc: '/images/BronzeBadge.png',
      description: 'Read 100,000 words to earn your very first badge.',
    },
    {
      id: 'gold',
      name: 'Gold Scholar',
      wordsRequired: 500000,
      imageSrc: '/images/GoldBadge.png',
      description: 'Keep up the momentum! Read 500,000 words to shine in gold.',
    },
    {
      id: 'diamond',
      name: 'Diamond Luminary',
      wordsRequired: 1000000,
      imageSrc: '/images/DiamondBadge.png',
      description: 'One million words makes you a legend of the library.',
    },
  ];

  const badges = badgeTiers.map((badge) => {
    const progress = Math.min(totalWordsRead / badge.wordsRequired, 1);
    return {
      ...badge,
      earned: totalWordsRead >= badge.wordsRequired,
      progress: Number.isFinite(progress) ? progress : 0,
      remainingWords: Math.max(badge.wordsRequired - totalWordsRead, 0),
    };
  });

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-buttonHover">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                St Peter's Library
              </h1>
              <p className="text-white/90 mt-1 font-medium">Welcome back, {user?.name}!</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  Your Lexile Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-600">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Term {currentTerm}, {currentYear}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Book Lexile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.avgLexile}L
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-10"
        >
          <Card className="border-2 border-primary/10 shadow-cardHover bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-semibold text-primary">
                Collectable Reading Badges
              </CardTitle>
              <p className="text-muted-foreground text-sm max-w-2xl">
                Every badge celebrates huge reading milestones. Keep reading to unlock them all
                and watch this trophy shelf fill up!
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`relative h-full rounded-2xl border p-5 backdrop-blur-sm transition duration-300 ${
                      badge.earned
                        ? 'border-emerald-300 bg-emerald-50/80 shadow-lg shadow-emerald-100'
                        : 'border-slate-200 bg-white/70 hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="relative">
                        <div className="h-28 w-28 rounded-3xl bg-white/80 shadow-inner flex items-center justify-center overflow-hidden">
                          <img
                            src={badge.imageSrc}
                            alt={`${badge.name} badge`}
                            className={`h-24 w-24 object-contain drop-shadow-lg ${
                              badge.earned ? '' : 'opacity-70 grayscale'
                            }`}
                          />
                        </div>
                        {badge.earned && (
                          <span className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
                            Earned
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                      </div>
                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <span>Progress</span>
                          <span>{Math.round(badge.progress * 100)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${
                              badge.earned ? 'bg-emerald-400' : 'bg-primary/70'
                            }`}
                            style={{ width: `${badge.progress * 100}%` }}
                          />
                        </div>
                        {badge.earned ? (
                          <p className="text-xs font-semibold text-emerald-600">
                            Amazing! You&apos;ve unlocked this badge.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {badge.remainingWords.toLocaleString()} words to go.
                          </p>
                        )}
                        {!badge.earned && badge.id !== 'bronze' && (
                          <p className="text-[11px] italic text-slate-400">
                            Badge artwork coming soon!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
              <Button
                onClick={handleAddBook}
                size="lg"
                className="gap-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
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
                  Start logging the books you've read to earn points! Books above your lexile level earn 3 points, at your level earn 2 points, and below earn 1 point.
                </p>
                <Button
                  onClick={handleAddBook}
                  size="lg"
                  className="gap-2"
                >
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
                    studentLexile={currentLexile}
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
                  studentLexile={currentLexile}
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
          studentLexile={currentLexile}
        />
      )}
    </div>
  );
};

