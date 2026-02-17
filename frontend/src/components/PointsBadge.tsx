import { Trophy } from 'lucide-react';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
}

export const PointsBadge: React.FC<PointsBadgeProps> = ({ points, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Badge 
        variant="secondary" 
        className={`${sizeClasses[size]} font-extrabold flex items-center gap-1 shadow-sm border-2 border-secondary/30`}
      >
        <Trophy className={`${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
        {points} points
      </Badge>
    </motion.div>
  );
};

