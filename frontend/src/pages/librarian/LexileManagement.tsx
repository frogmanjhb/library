import { useState, useEffect } from 'react';
import { BookOpen, LogOut, Upload, ArrowLeft, TrendingUp, TrendingDown, Minus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface StudentLexileData {
  id: string;
  name: string;
  grade: number | null;
  class: string | null;
  term1: number | null;
  term2: number | null;
  term3: number | null;
  trend12: number | null;
  trend23: number | null;
  currentLexile: number | null;
}

interface BulkUploadResult {
  line: number;
  name: string;
  status: string;
  lexile?: number;
  error?: string;
}

export const LexileManagement = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // Filter states
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  
  // Data states
  const [students, setStudents] = useState<StudentLexileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState<number>(1);
  
  // Inline edit states
  const [editingCell, setEditingCell] = useState<{ studentId: string; term: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // Bulk upload states
  const [bulkData, setBulkData] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkUploadResult[] | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [selectedGrade, selectedClass, selectedYear]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: any = { year: selectedYear };
      if (selectedGrade) params.grade = selectedGrade;
      if (selectedClass) params.className = selectedClass;
      
      const response = await api.get('/api/lexile/class', { params });
      setStudents(response.data.students);
      setCurrentTerm(response.data.currentTerm);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (studentId: string, term: number, currentValue: number | null) => {
    setEditingCell({ studentId, term });
    setEditValue(currentValue?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    
    setSaving(true);
    try {
      await api.post(`/api/lexile/student/${editingCell.studentId}`, {
        term: editingCell.term,
        year: selectedYear,
        lexile: parseInt(editValue) || 0
      });
      
      await fetchStudents();
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving lexile:', error);
      alert('Failed to save lexile level');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      alert('Please enter some data to upload');
      return;
    }

    setBulkUploading(true);
    setBulkResults(null);
    
    try {
      const response = await api.post('/api/lexile/bulk', {
        data: bulkData,
        term: selectedTerm,
        year: selectedYear,
        grade: selectedGrade || undefined,
        className: selectedClass || undefined
      });
      
      setBulkResults(response.data.results);
      
      if (response.data.summary.success > 0) {
        await fetchStudents();
      }
    } catch (error) {
      console.error('Error uploading bulk data:', error);
      alert('Failed to upload bulk data');
    } finally {
      setBulkUploading(false);
    }
  };

  const renderTrendArrow = (trend: number | null) => {
    if (trend === null) return <Minus className="w-4 h-4 text-gray-400" />;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const renderLexileCell = (student: StudentLexileData, term: number) => {
    const value = term === 1 ? student.term1 : term === 2 ? student.term2 : student.term3;
    const isEditing = editingCell?.studentId === student.id && editingCell?.term === term;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-20 h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <Button size="sm" variant="ghost" onClick={handleSaveEdit} disabled={saving}>
            <Save className="w-3 h-3" />
          </Button>
        </div>
      );
    }
    
    return (
      <button
        onClick={() => handleStartEdit(student.id, term, value)}
        className="px-2 py-1 rounded hover:bg-gray-100 min-w-[60px] text-center"
      >
        {value !== null ? `${value}L` : '-'}
      </button>
    );
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-buttonHover">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                Lexile Level Management
              </h1>
              <p className="text-white/90 mt-1 font-medium">Track and manage student lexile levels</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={() => navigate('/librarian')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button variant="secondary" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
                <select
                  className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <option value="">All Grades</option>
                  {[3, 4, 5, 6, 7].map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class</label>
                <select
                  className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Academic Year</label>
                <select
                  className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Upload Section */}
        {showBulkUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Bulk Upload Lexile Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Term</label>
                    <select
                      className="w-full h-11 rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                    >
                      <option value={1}>Term 1</option>
                      <option value={2}>Term 2</option>
                      <option value={3}>Term 3</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">
                      Paste data as: <code className="bg-gray-100 px-1 rounded">Student Name, Lexile</code> (one per line)
                    </p>
                  </div>
                </div>
                
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="John Smith, 650
Jane Doe, 720
Bob Wilson, 580"
                  className="w-full min-h-[150px] rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-mono font-medium mb-4 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30"
                />
                
                <div className="flex gap-2">
                  <Button onClick={handleBulkUpload} disabled={bulkUploading}>
                    {bulkUploading ? 'Uploading...' : 'Upload Data'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowBulkUpload(false);
                    setBulkData('');
                    setBulkResults(null);
                  }}>
                    Cancel
                  </Button>
                </div>

                {/* Bulk Upload Results */}
                {bulkResults && (
                  <div className="mt-4 border rounded-md">
                    <div className="px-4 py-2 bg-gray-50 border-b">
                      <span className="font-medium">Upload Results</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({bulkResults.filter(r => r.status === 'success').length} success, 
                        {bulkResults.filter(r => r.status === 'error').length} errors)
                      </span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {bulkResults.map((result, idx) => (
                        <div
                          key={idx}
                          className={`px-4 py-2 text-sm flex justify-between items-center ${
                            result.status === 'error' ? 'bg-rose-50' : 'bg-emerald-50'
                          } ${idx !== bulkResults.length - 1 ? 'border-b' : ''}`}
                        >
                          <span>
                            Line {result.line}: {result.name}
                          </span>
                          {result.status === 'success' ? (
                            <span className="text-emerald-600">Saved: {result.lexile}L</span>
                          ) : (
                            <span className="text-rose-600">{result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Student Lexile Levels - {selectedYear}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (Current term: {currentTerm})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found. Try adjusting your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left font-semibold">Student</th>
                      <th className="p-3 text-left font-semibold">Grade</th>
                      <th className="p-3 text-center font-semibold">Term 1</th>
                      <th className="p-3 text-center font-semibold w-10"></th>
                      <th className="p-3 text-center font-semibold">Term 2</th>
                      <th className="p-3 text-center font-semibold w-10"></th>
                      <th className="p-3 text-center font-semibold">Term 3</th>
                      <th className="p-3 text-center font-semibold">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className="font-medium">{student.name}</span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {student.grade ? `${student.grade}${student.class || ''}` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {renderLexileCell(student, 1)}
                        </td>
                        <td className="p-3 text-center">
                          {renderTrendArrow(student.trend12)}
                        </td>
                        <td className="p-3 text-center">
                          {renderLexileCell(student, 2)}
                        </td>
                        <td className="p-3 text-center">
                          {renderTrendArrow(student.trend23)}
                        </td>
                        <td className="p-3 text-center">
                          {renderLexileCell(student, 3)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-semibold ${
                            student.currentLexile ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {student.currentLexile ? `${student.currentLexile}L` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> = Lexile increased
                <TrendingDown className="w-4 h-4 text-rose-500 ml-4" /> = Lexile decreased
                <Minus className="w-4 h-4 text-gray-400 ml-4" /> = No change or no data
              </p>
              <p className="mt-1">Click on any lexile value to edit it inline.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
