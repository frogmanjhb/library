import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export const SignUp = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    class: '',
    lexileLevel: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'LIBRARIAN') {
        navigate('/librarian/dashboard');
      }
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/signup', formData);
      await login(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = formData.email.endsWith('@stpeters.co.za') || formData.email === '';
  const passwordsMatch = formData.password === formData.confirmPassword;
  const passwordLongEnough = formData.password.length >= 6 || formData.password === '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-primary mb-2">
              St Peter's Library
            </h1>
            <p className="text-xl font-semibold text-gray-700">
              Student Sign Up
            </p>
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Sign up with your St Peter's school email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  name="name"
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-12"
                />
              </div>
              <div>
                <Input
                  name="surname"
                  type="text"
                  placeholder="Surname"
                  value={formData.surname}
                  onChange={handleChange}
                  required
                  className="h-12"
                />
              </div>
            </div>

            <div>
              <Input
                name="class"
                type="text"
                placeholder="Class (e.g. 3A)"
                value={formData.class}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <div>
              <Input
                name="lexileLevel"
                type="number"
                placeholder="Lexile Level (optional)"
                value={formData.lexileLevel}
                onChange={handleChange}
                min={0}
                className="h-12"
              />
            </div>

            <div>
              <Input
                name="email"
                type="email"
                placeholder="your.name@stpeters.co.za"
                value={formData.email}
                onChange={handleChange}
                required
                className={`h-12 ${!isValidEmail && formData.email ? 'border-red-500' : ''}`}
              />
              {!isValidEmail && formData.email && (
                <p className="text-xs text-red-600 mt-1">Email must end with @stpeters.co.za</p>
              )}
            </div>

            <div>
              <Input
                name="password"
                type="password"
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                className={`h-12 ${!passwordLongEnough && formData.password ? 'border-red-500' : ''}`}
              />
              {!passwordLongEnough && formData.password && (
                <p className="text-xs text-red-600 mt-1">Password must be at least 6 characters</p>
              )}
            </div>

            <div>
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`h-12 ${!passwordsMatch && formData.confirmPassword ? 'border-red-500' : ''}`}
              />
              {!passwordsMatch && formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || !passwordsMatch || !passwordLongEnough || !isValidEmail}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
