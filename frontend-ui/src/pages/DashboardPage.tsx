import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherService, subjectService, classService } from '../services/api';
import { Users, BookOpen, GraduationCap } from 'lucide-react';
import { cn } from '../utils/cn';

const DashboardPage: React.FC = () => {
  const { data: teachers, isLoading: loadingTeachers, isError: errorTeachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects, isLoading: loadingSubjects, isError: errorSubjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: classes, isLoading: loadingClasses, isError: errorClasses } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });

  if (loadingTeachers || loadingSubjects || loadingClasses) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-4xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-2 font-medium">Welcome back to ChronoSchool Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          icon={<Users className="text-brand-dark" size={24} />} 
          label="Total Teachers" 
          value={teachers?.length || 0}
          trend="+2 this month"
          color="bg-brand-primary"
        />
        <StatCard 
          icon={<BookOpen className="text-brand-dark" size={24} />} 
          label="Subjects Offered" 
          value={subjects?.length || 0}
          trend="All active"
          color="bg-brand-secondary"
        />
        <StatCard 
          icon={<GraduationCap className="text-brand-dark" size={24} />} 
          label="Total Classes" 
          value={classes?.length || 0}
          trend="8 schedules set"
          color="bg-white"
        />
      </div>

      <div className="bg-brand-dark p-10 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4">Ready to generate schedules?</h3>
          <p className="text-gray-400 max-w-md mb-8">Our AI-powered solver is ready to optimize your school timetable with the click of a button.</p>
          <button className="bg-brand-primary text-brand-dark px-8 py-3 rounded-full font-bold hover:brightness-110 transition-all">
            Open Scheduler
          </button>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-primary rounded-full blur-[100px] opacity-20"></div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; trend: string; color: string }> = ({ icon, label, value, trend, color }) => (
  <div className={cn("p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between h-48 transition-transform hover:scale-[1.02]", color === 'bg-white' ? 'bg-white' : color)}>
    <div className="flex justify-between items-start">
      <div className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">{icon}</div>
      <span className="text-xs font-bold px-3 py-1 bg-white/50 rounded-full border border-white/50">{trend}</span>
    </div>
    <div>
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-4xl font-black text-brand-dark mt-1">{value}</p>
    </div>
  </div>
);

export default DashboardPage;
