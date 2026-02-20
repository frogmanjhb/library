import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen,
  Award,
  BarChart3,
  Trophy,
  GraduationCap,
  MessageSquare,
  Search,
  TrendingUp,
  Users,
  Megaphone,
  Settings,
  Shield,
  Sparkles,
  BookMarked,
} from 'lucide-react';
import { MILESTONES, TIER_IMAGE_KEYS } from '@/lib/reading-tiers';

export const Info = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-400 via-orange-300 to-amber-300">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold text-foreground">
            Pageforge
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm" className="text-foreground">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-16">
        {/* Hero */}
        <section className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Pageforge Reading Tracker
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-foreground/90">
            A school reading platform that helps students log books, earn rewards, and grow as readers. 
            Teachers and librarians get the tools they need to support every learner.
          </p>
        </section>

        {/* Overview */}
        <section className="mb-12">
          <Card className="border-2 border-white/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5" />
                What is Pageforge?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Pageforge is a web app built for school libraries. Students log the books they read, 
                earn points for the books you read and unlock reading tiers and certificates. 
                Teachers can see and comment on their class&apos;s logs; librarians manage the whole school 
                and post announcements.
              </p>
              <p>
                Everything runs in the browser—no app store—and works on phones, tablets, and computers. 
                Access is restricted to your school account for a safe, focused experience.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* For Students */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-7 w-7" />
            For Students
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookMarked className="h-4 w-4" />
                  Log your reading
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Add books with title, author, rating, and comments. Optional word count and Lexile level 
                help track progress. Logs are reviewed by your teacher or librarian so points count once approved.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4" />
                  Points & tiers
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Earn points for the books you read. Climb from Beginner through Explorer, Guardian, Champion, 
                Master, Hero, Legend, Mythic, and Apex. Unlock certificates as you reach each tier.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Your stats
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                See total books read, total words, and average Lexile. Track your reading XP and progress 
                toward the next tier at a glance.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4" />
                  Leaderboards
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Compete on grade and school leaderboards. See who&apos;s reading the most by points and words, 
                and by Lexile growth. Friendly competition keeps everyone motivated.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Reading Tiers */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-foreground">Reading tiers</h2>
          <Card className="border-2 border-white/50">
            <CardContent className="pt-6">
              <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 md:grid-cols-5">
                {MILESTONES.map((m) => (
                  <li key={m.key} className="flex items-center gap-3 rounded-lg bg-white/50 px-3 py-2">
                    {TIER_IMAGE_KEYS.includes(m.key) ? (
                      <img
                        src={`/images/tiers/${m.key}.png`}
                        alt=""
                        className="h-8 w-8 shrink-0 object-contain"
                      />
                    ) : (
                      <span className="text-lg" aria-hidden>{m.icon}</span>
                    )}
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">({m.threshold}+)</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* For Teachers */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
            <GraduationCap className="h-7 w-7" />
            For Teachers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  View class logs
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                See reading logs for students in your grade or class. Approve or reject logs so points 
                are awarded fairly and encourage quality entries.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  Comment & react
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Leave comments and reactions on student book logs. Celebrate great choices and nudge 
                readers with feedback.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Filter & search
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Filter logs by status, date, or student. Search by book title or author to see who&apos;s 
                reading what across your class.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Class progress
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Track how your class is doing overall. Spot trends and support students who need a little 
                extra encouragement.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* For Parents */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
            <Users className="h-7 w-7" />
            For Parents
          </h2>
          <Card className="border-2 border-white/50">
            <CardContent className="pt-6">
              <p className="mb-4 text-muted-foreground">
                Pageforge gives your child a clear place to record what they read and see their progress. 
                Students earn points and unlock tiers and certificates, which many find motivating. 
                Teachers and librarians oversee the process and can comment on logs, so reading stays 
                connected to the classroom.
              </p>
              <p className="text-muted-foreground">
                If your school uses Pageforge, your child will sign in with their school account. 
                For questions about access or data, please contact your school or librarian.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* For Librarians / Schools */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
            <Settings className="h-7 w-7" />
            For Librarians & Schools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  Full access
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                View and manage all student reading logs across the school. Approve or reject logs and 
                adjust points when needed.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Create and manage school-wide announcements. Promote events, challenges, or new books 
                so every student sees them on their dashboard.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  School statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                See comprehensive stats for the whole school. Use the data for reporting and to spot 
                readers who need extra support or recognition.
              </CardContent>
            </Card>
            <Card className="border-2 border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Lexile management
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Manage student Lexile levels by term. Support reading growth and ensure the platform 
                reflects current assessments.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Security / Trust */}
        <section className="mb-12">
          <Card className="border-2 border-white/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Safe & school-focused
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Access is limited to your school domain. Students, teachers, and librarians sign in with 
              their school accounts. Data is used only to run the reading programme and support learning.
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="mb-4 text-lg font-medium text-foreground">
            Ready to get started?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-2">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};
