import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

export const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'LIBRARIAN') {
        navigate('/librarian/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-400 via-orange-300 to-amber-300">
        <div className="text-lg text-white/90">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-400 via-orange-300 to-amber-300">
        <div className="text-lg text-white/90">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-400 via-orange-300 to-amber-300 p-4">
      <Card className="w-full max-w-md border-2 border-white/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold text-primary mb-2">
              Pageforge
            </h1>
            <p className="text-xl font-bold text-foreground">
              Reading Tracker
            </p>
          </div>
          <CardDescription className="text-base">
            Sign in with your school account. New to Pageforge? Sign up to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Button
            asChild
            className="w-full h-12 text-base"
            size="lg"
          >
            <Link to="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 text-base border-2"
            size="lg"
          >
            <Link to="/signup">Sign Up</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
