import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  book: any | null;
  inline?: boolean;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ 
  isOpen, 
  onClose, 
  onSaved, 
  book,
  inline = false 
}) => {
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

      <div>
        <label className="block text-sm font-medium mb-1">
          Your Thoughts
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          placeholder="What did you think about this book?"
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

