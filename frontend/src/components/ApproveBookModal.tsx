import { useState, useEffect } from 'react';
import { X, Award, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
  comment?: string;
  lexileLevel?: number;
  wordCount?: number;
  user?: {
    name: string;
    grade?: number;
    class?: string;
  };
}

interface ApproveBookModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
}

export const ApproveBookModal: React.FC<ApproveBookModalProps> = ({
  book,
  isOpen,
  onClose,
  onApproved,
}) => {
  const [points, setPoints] = useState<string>('1');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (book && isOpen) {
      // Reset form when book changes
      setPoints('1');
      setMessage('');
      setError(null);
    }
  }, [book, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;

    const pointsNum = parseInt(points, 10);
    if (isNaN(pointsNum) || pointsNum < 0) {
      setError('Points must be a valid number (0 or greater)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.patch(`/api/books/${book.id}/verification`, {
        status: 'APPROVED',
        points: pointsNum,
        note: message.trim() || undefined,
      });
      onApproved();
      onClose();
    } catch (err: any) {
      console.error('Error approving book:', err);
      setError(
        err.response?.data?.message ||
          'Failed to approve book. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !book) return null;

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
          <Card className="w-full max-w-md border-2 border-primary/10 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-2xl font-bold">Approve Book</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Book Info */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                <h3 className="font-semibold text-lg mb-1">{book.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  by {book.author}
                </p>
                {book.user && (
                  <p className="text-xs text-muted-foreground">
                    Student: {book.user.name}
                    {book.user.grade &&
                      ` (Grade ${book.user.grade}${book.user.class || ''})`}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Points Input */}
                <div>
                  <label
                    htmlFor="points"
                    className="block text-sm font-medium mb-2"
                  >
                    <Award className="w-4 h-4 inline mr-1" />
                    Points to Award
                  </label>
                  <Input
                    id="points"
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => {
                      setPoints(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter points"
                    required
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Points will be added to the student&apos;s total.
                  </p>
                </div>

                {/* Message Input */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium mb-2"
                  >
                    Message to Student (Optional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a congratulatory message or feedback..."
                    className="w-full min-h-[100px] rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/30 resize-none"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {submitting ? 'Approving...' : 'Approve Book'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </motion.div>
      </>
    </AnimatePresence>
  );
};
