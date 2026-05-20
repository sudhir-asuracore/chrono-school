import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherService, subjectService, classService } from '../services/api';
import { Users, BookOpen, GraduationCap } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { data: teachers, isLoading: loadingTeachers, isError: errorTeachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects, isLoading: loadingSubjects, isError: errorSubjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: classes, isLoading: loadingClasses, isError: errorClasses } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });

  if (loadingTeachers || loadingSubjects || loadingClasses) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (errorTeachers || errorSubjects || errorClasses) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
        <h3 className="font-bold">Error loading dashboard data</h3>
        <p>Could not connect to the backend API. Please ensure it is running.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users className="text-blue-600" size={32} />} 
          label="Teachers" 
          value={teachers?.length || 0} 
        />
        <StatCard 
          icon={<BookOpen className="text-green-600" size={32} />} 
          label="Subjects" 
          value={subjects?.length || 0} 
        />
        <StatCard 
          icon={<GraduationCap className="text-purple-600" size={32} />} 
          label="Classes" 
          value={classes?.length || 0} 
        />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export default DashboardPage;
