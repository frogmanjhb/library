import { Star, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

interface BookCardProps {
  book: {
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
  };
  onEdit?: (book: any) => void;
  onDelete?: (bookId: string) => void;
  showActions?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  onEdit, 
  onDelete, 
  showActions = false 
}) => {
  const STATUS_STYLES: Record<BookCardProps['book']['status'], { label: string; className: string }> = {
    PENDING: {
      label: 'Pending Verification',
      className: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    APPROVED: {
      label: 'Verified',
      className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    },
    REJECTED: {
      label: 'Needs Review',
      className: 'bg-rose-100 text-rose-800 border border-rose-200',
    },
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-secondary text-secondary' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-1">{book.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                </div>
                <Badge className={`text-xs font-semibold ${STATUS_STYLES[book.status].className}`}>
                  {STATUS_STYLES[book.status].label}
                </Badge>
              </div>
            </div>
            {book.coverUrl && (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-12 h-16 object-cover rounded ml-2"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 mb-3">
            {renderStars(book.rating)}
          </div>

          {book.comment && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-2">{book.comment}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {book.lexileLevel && (
              <Badge variant="outline">Lexile: {book.lexileLevel}L</Badge>
            )}
            {book.wordCount && (
              <Badge variant="outline">{book.wordCount.toLocaleString()} words</Badge>
            )}
          </div>

          {book.genres && book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {book.genres.slice(0, 3).map((genre, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {new Date(book.createdAt).toLocaleDateString()}
            </span>
            {showActions && (
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(book)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(book.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {(book.status !== 'APPROVED' || book.verificationNote) && (
            <div
              className={`mt-4 rounded-md px-3 py-2 text-xs ${
                book.status === 'APPROVED'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : book.status === 'REJECTED'
                    ? 'border border-rose-200 bg-rose-50 text-rose-800'
                    : 'border border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {book.verificationNote
                ? book.verificationNote
                : book.status === 'REJECTED'
                  ? 'A librarian has requested updates for this entry. Please review and resubmit.'
                  : 'Awaiting librarian verification.'}
            </div>
          )}

          {book.status === 'APPROVED' && book.verifiedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Verified on {new Date(book.verifiedAt).toLocaleDateString()}
              {book.verifiedBy?.name ? ` by ${book.verifiedBy.name}` : ''}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

