import { Megaphone, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  author: {
    name: string;
  };
}

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcements }) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissed.includes(a.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {visibleAnnouncements.map((announcement) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ rotate: [0, -2.5, 2.5, -2.5, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            >
              <Card className="bg-gradient-to-r from-secondary/20 to-secondary/10 border-secondary/30">
                <div className="p-4 flex items-start gap-3">
                  <Megaphone className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {announcement.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posted by {announcement.author.name} •{' '}
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setDismissed([...dismissed, announcement.id])}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

