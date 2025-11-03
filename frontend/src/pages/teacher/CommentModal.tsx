import { useState, useEffect } from 'react';
import { X, ThumbsUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: string;
  content: string;
  reactions: number;
  createdAt: string;
  teacher: {
    name: string;
    email: string;
  };
}

interface CommentModalProps {
  bookId: string;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({ 
  bookId, 
  onClose, 
  onCommentAdded 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [bookId]);

  const fetchComments = async () => {
    try {
      const response = await api.get(`/api/comments/${bookId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await api.post('/api/comments', {
        bookId,
        content: newComment,
      });
      setNewComment('');
      fetchComments();
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (commentId: string) => {
    try {
      await api.put(`/api/comments/${commentId}/react`);
      fetchComments();
    } catch (error) {
      console.error('Error reacting to comment:', error);
    }
  };

  return (
    <AnimatePresence>
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
                <h2 className="text-2xl font-bold">Comments & Feedback</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment or feedback..."
                    className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button type="submit" disabled={submitting || !newComment.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Sending...' : 'Send Comment'}
                  </Button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No comments yet. Be the first to leave feedback!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{comment.teacher.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReact(comment.id)}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {comment.reactions}
                        </Button>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

