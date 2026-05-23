import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { teacherService, subjectService, classService, savedTimetableService } from '../services/api';
import { Users, BookOpen, GraduationCap, Calendar, Edit3, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { ScheduleEntry, Subject, Teacher } from '../types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: teachers, isLoading: loadingTeachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects, isLoading: loadingSubjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: classes, isLoading: loadingClasses } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: savedTimetables, isLoading: loadingTimetables } = useQuery({ queryKey: ['saved-timetables'], queryFn: savedTimetableService.getAll });

  const [selectedTimetableId, setSelectedTimetableId] = useState<string>(() => localStorage.getItem('dashboard_selected_timetable_id') || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => localStorage.getItem('dashboard_selected_class_id') || '');

  useEffect(() => {
    localStorage.setItem('dashboard_selected_timetable_id', selectedTimetableId);
  }, [selectedTimetableId]);

  useEffect(() => {
    localStorage.setItem('dashboard_selected_class_id', selectedClassId);
  }, [selectedClassId]);

  const selectedTimetable = savedTimetables?.find(t => t.id === selectedTimetableId);

  if (loadingTeachers || loadingSubjects || loadingClasses || loadingTimetables) {
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

      {/* Timetable Selection Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Weekly Overview</h3>
            <p className="text-gray-500 font-medium mt-1">View and manage your saved timetables</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-1.5 pl-4">
              <Calendar size={18} className="text-gray-400 mr-2" />
              <select
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 pr-8"
                value={selectedTimetableId}
                onChange={(e) => {
                  setSelectedTimetableId(e.target.value);
                  if (!selectedClassId && classes?.length) setSelectedClassId(classes[0].id);
                }}
              >
                <option value="">Select Timetable...</option>
                {savedTimetables?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTimetable && (
              <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-1.5 pl-4">
                <GraduationCap size={18} className="text-gray-400 mr-2" />
                <select
                  className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 pr-8"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Select Class...</option>
                  {classes?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedTimetable && (
              <button
                onClick={() => navigate(`/scheduler?id=${selectedTimetableId}`)}
                className="flex items-center space-x-2 bg-brand-dark text-white px-6 py-3 rounded-2xl font-bold hover:brightness-125 transition-all shadow-md group"
              >
                <Edit3 size={18} className="group-hover:rotate-12 transition-transform" />
                <span>Modify</span>
              </button>
            )}
          </div>
        </div>

        {!selectedTimetable ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
             <div className="p-4 bg-white rounded-3xl shadow-sm mb-4">
               <Calendar className="text-brand-primary" size={32} />
             </div>
             <p className="text-gray-500 font-bold">Select a timetable to view its overview</p>
             <p className="text-gray-400 text-sm mt-1">Quickly access and edit your optimized schedules</p>
          </div>
        ) : (
          <>
            {selectedTimetable.is_stale && (
              <div className="mb-8 bg-orange-50 border border-orange-200 p-6 rounded-3xl flex items-center space-x-4 text-orange-900 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="bg-orange-500 text-white p-2 rounded-xl shadow-lg shadow-orange-200">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-base font-black">Stale Timetable Remark</p>
                  <p className="text-sm font-bold opacity-70">Some entries in this timetable have been deleted. Look for the stale indicator in the grid below.</p>
                </div>
              </div>
            )}
            <ReadOnlyTimetable
              schedule={selectedTimetable.data}
              classId={selectedClassId}
              subjects={subjects || []}
              teachers={teachers || []}
            />
          </>
        )}
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

const ReadOnlyTimetable: React.FC<{
  schedule: ScheduleEntry[],
  classId: string,
  subjects: Subject[],
  teachers: Teacher[]
}> = ({ schedule, classId, subjects, teachers }) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const slots = Array.from({ length: 8 }, (_, i) => i);

  const currentDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];

  const filteredSchedule = schedule.filter(e => e.class_id === classId);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-separate border-spacing-2 min-w-[800px]">
        <thead>
          <tr>
            <th className="p-2 w-24"></th>
            {slots.map(slot => (
              <th key={slot} className="p-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                Slot {slot + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => {
            const isToday = day === currentDay;
            return (
              <tr key={day} className={cn(isToday && "bg-brand-primary/10 rounded-2xl")}>
                <td className="p-4">
                  <div className={cn(
                    "text-xs font-black uppercase tracking-[0.2em]",
                    isToday ? "text-brand-dark" : "text-gray-400"
                  )}>
                    {day}
                  </div>
                </td>
                {slots.map(slot => {
                  const entry = filteredSchedule.find(e => e.day === day && e.slot_index === slot);
                  const subject = subjects.find(s => s.id === entry?.subject_id);
                  const teacher = teachers.find(t => t.id === entry?.teacher_id);
                  const isStale = entry && (!subject || !teacher);

                  return (
                    <td key={slot} className="p-1 min-w-[120px]">
                      {entry ? (
                        <div
                          className={cn(
                            "p-3 rounded-2xl border shadow-sm relative group transition-all",
                            isStale ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"
                          )}
                          style={{ borderLeftColor: subject?.color || (isStale ? '#f97316' : '#eee'), borderLeftWidth: '4px' }}
                        >
                          {isStale && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                              <AlertTriangle size={8} />
                            </div>
                          )}
                          <p className={cn(
                            "text-[10px] font-black uppercase mb-0.5 truncate",
                            isStale ? "text-orange-700" : "text-gray-400"
                          )}>
                            {subject?.name || 'Deleted'}
                          </p>
                          <p className={cn(
                            "text-xs font-bold truncate",
                            isStale ? "text-orange-900" : "text-brand-dark"
                          )}>
                            {teacher?.name || 'Deleted'}
                          </p>
                        </div>
                      ) : (
                        <div className="h-14 rounded-2xl bg-gray-50/50 border border-gray-100/50"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardPage;
