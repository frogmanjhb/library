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
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">{book.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
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
        </CardContent>
      </Card>
    </motion.div>
  );
};

