import { useState, useEffect } from 'react';
import { X, Star, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  book: any | null;
  inline?: boolean;
  studentLexile?: number | null;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ 
  isOpen, 
  onClose, 
  onSaved, 
  book,
  inline = false,
  studentLexile: propStudentLexile
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    rating: 5,
    comment: '',
    lexileLevel: '',
    wordCount: '',
    ageRange: '',
    genres: '',
    coverUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [studentLexile, setStudentLexile] = useState<number | null>(propStudentLexile ?? null);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        rating: book.rating || 5,
        comment: book.comment || '',
        lexileLevel: book.lexileLevel?.toString() || '',
        wordCount: book.wordCount?.toString() || '',
        ageRange: book.ageRange || '',
        genres: book.genres?.join(', ') || '',
        coverUrl: book.coverUrl || '',
      });
    }
  }, [book]);

  useEffect(() => {
    // Fetch student's current lexile if not provided as prop
    if (user && propStudentLexile === undefined) {
      api.get(`/api/lexile/student/${user.id}`)
        .then(res => setStudentLexile(res.data.currentLexile))
        .catch(() => setStudentLexile(null));
    }
  }, [user, propStudentLexile]);

  // Calculate expected points based on book lexile vs student lexile
  const getExpectedPoints = () => {
    const bookLexile = parseInt(formData.lexileLevel);
    if (!bookLexile || !studentLexile) return null;
    
    if (bookLexile > studentLexile) return 3;
    if (bookLexile >= studentLexile - 50) return 2;
    return 1;
  };

  const expectedPoints = getExpectedPoints();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        lexileLevel: formData.lexileLevel ? parseInt(formData.lexileLevel) : null,
        wordCount: formData.wordCount ? parseInt(formData.wordCount) : null,
        genres: formData.genres ? formData.genres.split(',').map(g => g.trim()) : [],
      };

      if (book) {
        await api.put(`/api/books/${book.id}`, data);
      } else {
        await api.post('/api/books', data);
      }

      onSaved();
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelector = () => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, rating: star })}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 ${
                star <= formData.rating
                  ? 'fill-secondary text-secondary'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!book && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your log will show as pending until a librarian reviews it. Points are added after approval.
        </div>
      )}
      
      {/* Lexile-based points guidance */}
      {studentLexile && !book && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Your Lexile Level: {studentLexile}L</p>
              <p className="mt-1">Points are based on the book's lexile compared to yours:</p>
              <ul className="mt-1 ml-4 list-disc">
                <li><span className="font-medium text-emerald-700">3 points</span> — Book above your level (challenging read)</li>
                <li><span className="font-medium text-blue-700">2 points</span> — Book at your level (just right)</li>
                <li><span className="font-medium text-amber-700">1 point</span> — Book below your level</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Book Title <span className="text-red-500">*</span>
        </label>
        <Input
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter book title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Author <span className="text-red-500">*</span>
        </label>
        <Input
          required
          value={formData.author}
          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
          placeholder="Enter author name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        {renderStarSelector()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Book Lexile Level
          </label>
          <Input
            type="number"
            value={formData.lexileLevel}
            onChange={(e) => setFormData({ ...formData, lexileLevel: e.target.value })}
            placeholder="Enter Lexile Level"
          />
          {expectedPoints !== null && (
            <p className={`text-xs mt-1 font-medium ${
              expectedPoints === 3 ? 'text-emerald-600' : 
              expectedPoints === 2 ? 'text-blue-600' : 'text-amber-600'
            }`}>
              Expected: {expectedPoints} point{expectedPoints !== 1 ? 's' : ''} 
              {expectedPoints === 3 ? ' (above your level!)' : 
               expectedPoints === 2 ? ' (at your level)' : ' (below your level)'}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Word Count
          </label>
          <Input
            type="number"
            value={formData.wordCount}
            onChange={(e) => setFormData({ ...formData, wordCount: e.target.value })}
            placeholder="Enter Word Count"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Your Thoughts
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          placeholder="What did you think about this book?"
          className="w-full min-h-[100px] rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/30"
        />
      </div>


      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : book ? 'Update Book' : 'Submit for Verification'}
        </Button>
        {!inline && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (inline) {
    return formContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-primary/10 shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {book ? 'Edit Book' : 'Log a New Book'}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                {formContent}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

