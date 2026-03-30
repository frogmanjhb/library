import { useState, useEffect } from 'react';
import { X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export interface EditVerifiedBookModalBook {
  id: string;
  title: string;
  author: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  rating: number;
  comment?: string | null;
  verificationNote?: string | null;
  lexileLevel?: number | null;
  pointsAwardedValue?: number;
  verifiedAt?: string | null;
  user?: {
    name: string;
    grade?: number | null;
    class?: string | null;
    currentLexile?: number | null;
  };
}

interface EditVerifiedBookModalProps {
  book: EditVerifiedBookModalBook | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EditVerifiedBookModal: React.FC<EditVerifiedBookModalProps> = ({
  book,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [status, setStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [points, setPoints] = useState<string>('1');
  const [verificationNote, setVerificationNote] = useState('');
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (book && isOpen) {
      const s = book.status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
      setStatus(s);
      setPoints(String(book.pointsAwardedValue ?? 1));
      setVerificationNote(book.verificationNote ?? '');
      setReflection(book.comment ?? '');
      setError(null);
    }
  }, [book, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;

    const pointsNum = parseInt(points, 10);
    if (status === 'APPROVED' && (isNaN(pointsNum) || pointsNum < 0)) {
      setError('Points must be a valid number (0 or greater)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.patch(`/api/books/${book.id}/verification`, {
        status,
        note: verificationNote.trim() || undefined,
        ...(status === 'APPROVED' ? { points: pointsNum } : {}),
      });

      const originalReflection = book.comment ?? '';
      if (reflection.trim() !== originalReflection.trim()) {
        await api.put(`/api/books/${book.id}`, {
          comment: reflection.trim(),
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error updating verified book:', err);
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof (err.response.data as { message: unknown }).message === 'string'
          ? (err.response.data as { message: string }).message
          : 'Failed to save changes. Please try again.';
      setError(message);
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <Card className="w-full max-w-lg border-2 border-primary/10 shadow-2xl my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Pencil className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Edit verification</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-6 p-4 bg-muted/50 rounded-lg border space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">by {book.author}</p>
                  {book.lexileLevel != null && (
                    <p className="text-xs text-muted-foreground mt-1">Book Lexile: {book.lexileLevel}L</p>
                  )}
                </div>
                {book.user && (
                  <p className="text-sm font-medium">
                    Student: {book.user.name}
                    {book.user.grade != null &&
                      ` (Grade ${book.user.grade}${book.user.class ?? ''})`}
                  </p>
                )}
                {book.verifiedAt && (
                  <p className="text-xs text-muted-foreground">
                    Verified on {new Date(book.verifiedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium mb-2">Decision</legend>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="verify-status"
                        className="h-4 w-4 accent-primary"
                        checked={status === 'APPROVED'}
                        onChange={() => setStatus('APPROVED')}
                      />
                      <span className="text-sm font-medium">Approved</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="verify-status"
                        className="h-4 w-4 accent-primary"
                        checked={status === 'REJECTED'}
                        onChange={() => setStatus('REJECTED')}
                      />
                      <span className="text-sm font-medium">Rejected</span>
                    </label>
                  </div>
                </fieldset>

                {status === 'APPROVED' && (
                  <div>
                    <label htmlFor="edit-points" className="block text-sm font-medium mb-2">
                      Points awarded
                    </label>
                    <Input
                      id="edit-points"
                      type="number"
                      min={0}
                      value={points}
                      onChange={(e) => {
                        setPoints(e.target.value);
                        setError(null);
                      }}
                      className="text-lg font-semibold"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Changing points adjusts the student&apos;s total by the difference.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="verification-note" className="block text-sm font-medium mb-2">
                    Message to student (verification note)
                  </label>
                  <textarea
                    id="verification-note"
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    placeholder="Feedback shown with this book log…"
                    className="w-full min-h-[88px] rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/30 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="student-reflection" className="block text-sm font-medium mb-2">
                    Student reflection (book comment)
                  </label>
                  <textarea
                    id="student-reflection"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Student's written reflection — you may correct typos or clarify."
                    className="w-full min-h-[100px] rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/30 resize-none"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? 'Saving…' : 'Save changes'}
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
