import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

// Class codes by grade
const CLASSES_BY_GRADE: Record<number, string[]> = {
  3: ['3SC', '3SCA', '3TB'],
  4: ['4KM', '4DA', '4KW'],
  5: ['5EF', '5JS', '5AM'],
  6: ['6A', '6B', '6C'],
  7: ['7A', '7B', '7C'],
};

export const SignUp = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    grade: '',
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

  // Reset class when grade changes
  useEffect(() => {
    if (formData.grade && !CLASSES_BY_GRADE[Number(formData.grade)]?.includes(formData.class)) {
      setFormData((prev) => ({ ...prev, class: '' }));
    }
  }, [formData.grade]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-400 via-orange-300 to-amber-300 p-4">
      <Card className="w-full max-w-md border-2 border-white/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold text-primary mb-2">
              St Peter's Library
            </h1>
            <p className="text-xl font-bold text-foreground">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="grade" className="block text-sm font-medium mb-1 text-muted-foreground">
                  Grade
                </label>
                <select
                  name="grade"
                  id="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  className="h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm"
                >
                  <option value="">Select Grade</option>
                  {[3, 4, 5, 6, 7].map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="class" className="block text-sm font-medium mb-1 text-muted-foreground">
                  Class
                </label>
                <select
                  name="class"
                  id="class"
                  value={formData.class}
                  onChange={handleChange}
                  required
                  disabled={!formData.grade}
                  className="h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">Select Class</option>
                  {formData.grade && CLASSES_BY_GRADE[Number(formData.grade)]?.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
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
