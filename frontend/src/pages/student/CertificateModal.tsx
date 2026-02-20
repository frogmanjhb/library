import React, { useState } from 'react';
import { X, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MILESTONES } from '@/lib/reading-tiers';
import { motion, AnimatePresence } from 'framer-motion';

/** Map tier names to their certificate filenames */
const getCertificateFilename = (tierName: string): string => {
  // Beginner.png is capitalized, all others are lowercase
  if (tierName === 'Beginner') return 'Beginner.png';
  return `${tierName.toLowerCase()}.png`;
};

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints: number;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  currentPoints,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleCertificateClick = (milestone: (typeof MILESTONES)[0], earned: boolean) => {
    if (!earned) return;
    const filename = getCertificateFilename(milestone.name);
    setPreviewUrl(`/images/certificates/${filename}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-card rounded-2xl border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              Reading Tier Certificates
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Certificates you have earned become clear and clickable. Locked tiers stay blurred until you reach the required points.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MILESTONES.map((milestone) => {
                const earned = currentPoints >= milestone.threshold;
                const certificateFilename = getCertificateFilename(milestone.name);
                return (
                  <div
                    key={milestone.key}
                    className={`
                      relative rounded-xl border-2 overflow-hidden transition-all
                      ${milestone.circleBg} ${milestone.circleBorder}
                      ${earned ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'}
                      ${!earned ? 'opacity-90' : ''}
                    `}
                    onClick={() => handleCertificateClick(milestone, earned)}
                    onKeyDown={(e) => {
                      if (earned && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleCertificateClick(milestone, earned);
                      }
                    }}
                    role={earned ? 'button' : undefined}
                    tabIndex={earned ? 0 : -1}
                    aria-label={earned ? `View ${milestone.name} certificate` : `${milestone.name} certificate (locked)`}
                  >
                    {/* Blur overlay when locked */}
                    {!earned && (
                      <div
                        className="absolute inset-0 bg-white/70 backdrop-blur-md z-10 rounded-xl pointer-events-auto"
                        aria-hidden
                      />
                    )}
                    <div className="aspect-[3/4] flex items-center justify-center p-4">
                      <img
                        src={`/images/certificates/${certificateFilename}`}
                        alt={`${milestone.name} certificate`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-2 text-center border-t bg-background/80">
                      <span className="font-semibold text-sm">{milestone.name}</span>
                      {earned ? (
                        <span className="block text-xs text-muted-foreground">Earned · Click to view</span>
                      ) : (
                        <span className="block text-xs text-muted-foreground">{milestone.threshold} pts to unlock</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full-size certificate preview */}
      <AnimatePresence>
        {previewUrl && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[60]"
              onClick={() => setPreviewUrl(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 z-[70] flex items-center justify-center p-4"
              onClick={() => setPreviewUrl(null)}
            >
              <img
                src={previewUrl}
                alt="Certificate full size"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
