import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export const Login = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'LIBRARIAN') {
        navigate('/librarian/dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email });
      await login(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (testEmail: string) => {
    setEmail(testEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-primary mb-2">
              St Peter's Library
            </h1>
            <p className="text-xl font-semibold text-gray-700">
              Reading Tracker
            </p>
          </div>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>
            Sign in with your St Peter's school email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="your.name@stpeters.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-center text-muted-foreground mb-3">
              Quick login (test accounts):
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => quickLogin('student3a1@stpeters.co.za')}
              >
                Student (Grade 3A)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => quickLogin('teacher1@stpeters.co.za')}
              >
                Teacher (Grade 3A)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => quickLogin('librarian@stpeters.co.za')}
              >
                Librarian
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Only @stpeters.co.za email addresses are allowed
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

