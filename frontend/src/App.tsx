import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { AuthCallback } from './pages/AuthCallback';
import { Home } from './pages/Home';
import { StudentDashboard } from './pages/student/Dashboard';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { LibrarianDashboard } from './pages/librarian/Dashboard';
import { LexileManagement } from './pages/librarian/LexileManagement';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/librarian/dashboard"
            element={
              <ProtectedRoute allowedRoles={['LIBRARIAN']}>
                <LibrarianDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/librarian"
            element={
              <ProtectedRoute allowedRoles={['LIBRARIAN']}>
                <LibrarianDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/librarian/lexile"
            element={
              <ProtectedRoute allowedRoles={['LIBRARIAN']}>
                <LexileManagement />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
