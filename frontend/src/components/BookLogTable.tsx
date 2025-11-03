import { Star, MessageSquare } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface Book {
  id: string;
  title: string;
  author: string;
  rating: number;
  comment?: string;
  lexileLevel?: number;
  wordCount?: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
    grade?: number;
    class?: string;
  };
  comments?: any[];
}

interface BookLogTableProps {
  books: Book[];
  onCommentClick?: (bookId: string) => void;
  showStudent?: boolean;
}

export const BookLogTable: React.FC<BookLogTableProps> = ({ 
  books, 
  onCommentClick,
  showStudent = true 
}) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 inline ${
          i < rating ? 'fill-secondary text-secondary' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (books.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No books found</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-semibold">Title</th>
              <th className="text-left p-4 font-semibold">Author</th>
              {showStudent && <th className="text-left p-4 font-semibold">Student</th>}
              <th className="text-left p-4 font-semibold">Rating</th>
              <th className="text-left p-4 font-semibold">Lexile</th>
              <th className="text-left p-4 font-semibold">Words</th>
              <th className="text-left p-4 font-semibold">Date</th>
              {onCommentClick && <th className="text-left p-4 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{book.title}</p>
                    {book.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {book.comment}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm">{book.author}</td>
                {showStudent && (
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium">{book.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Grade {book.user.grade}{book.user.class}
                      </p>
                    </div>
                  </td>
                )}
                <td className="p-4">{renderStars(book.rating)}</td>
                <td className="p-4">
                  {book.lexileLevel ? (
                    <Badge variant="outline">{book.lexileLevel}L</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-4">
                  {book.wordCount ? (
                    <span className="text-sm">{book.wordCount.toLocaleString()}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-4 text-sm">
                  {new Date(book.createdAt).toLocaleDateString()}
                </td>
                {onCommentClick && (
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCommentClick(book.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {book.comments?.length || 0}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

