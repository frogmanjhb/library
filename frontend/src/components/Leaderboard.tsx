import { useState, useEffect } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  grade?: number;
  class?: string;
  totalPoints?: number;
  booksRead?: number;
  totalWords?: number;
  avgLexile?: number;
}

export const Leaderboard = () => {
  const { user } = useAuth();
  const [gradeLeaderboard, setGradeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [schoolLeaderboard, setSchoolLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [wordsLeaderboard, setWordsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lexileLeaderboard, setLexileLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();

    // Setup socket listeners for realtime updates
    const socket = getSocket();
    socket.on('leaderboard:update', () => {
      fetchLeaderboards();
    });

    return () => {
      socket.off('leaderboard:update');
    };
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const [grade, school, words, lexile] = await Promise.all([
        user?.grade ? api.get(`/api/leaderboard/by-grade?grade=${user.grade}`) : Promise.resolve({ data: [] }),
        api.get('/api/leaderboard/school'),
        api.get('/api/leaderboard/words'),
        api.get('/api/leaderboard/lexile'),
      ]);

      setGradeLeaderboard(grade.data);
      setSchoolLeaderboard(school.data);
      setWordsLeaderboard(words.data);
      setLexileLeaderboard(lexile.data);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const renderLeaderboardTable = (entries: LeaderboardEntry[], type: string) => {
    if (loading) {
      return <div className="text-center p-8">Loading...</div>;
    }

    if (entries.length === 0) {
      return <div className="text-center p-8 text-muted-foreground">No data yet</div>;
    }

    return (
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={`${
              entry.userId === user?.id ? 'bg-primary/5 border-primary' : ''
            }`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center justify-center w-8">
                  {getMedalIcon(entry.rank) ? (
                    <span className="text-2xl">{getMedalIcon(entry.rank)}</span>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      #{entry.rank}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{entry.name}</p>
                  {entry.grade && (
                    <p className="text-xs text-muted-foreground">
                      Grade {entry.grade}{entry.class}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {type === 'points' && entry.totalPoints !== undefined && (
                    <Badge variant="secondary" className="font-bold">
                      <Trophy className="w-3 h-3 mr-1" />
                      {entry.totalPoints}
                    </Badge>
                  )}
                  {type === 'words' && entry.totalWords !== undefined && (
                    <Badge variant="secondary" className="font-bold">
                      {entry.totalWords.toLocaleString()} words
                    </Badge>
                  )}
                  {type === 'lexile' && entry.avgLexile !== undefined && (
                    <Badge variant="secondary" className="font-bold">
                      {entry.avgLexile}L avg
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.booksRead} books
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="w-6 h-6 text-secondary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="grade">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="grade">Grade</TabsTrigger>
            <TabsTrigger value="school">School</TabsTrigger>
            <TabsTrigger value="words">Words</TabsTrigger>
            <TabsTrigger value="lexile">Lexile</TabsTrigger>
          </TabsList>

          <TabsContent value="grade" className="mt-4">
            {renderLeaderboardTable(gradeLeaderboard, 'points')}
          </TabsContent>

          <TabsContent value="school" className="mt-4">
            {renderLeaderboardTable(schoolLeaderboard, 'points')}
          </TabsContent>

          <TabsContent value="words" className="mt-4">
            {renderLeaderboardTable(wordsLeaderboard, 'words')}
          </TabsContent>

          <TabsContent value="lexile" className="mt-4">
            {renderLeaderboardTable(lexileLeaderboard, 'lexile')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

