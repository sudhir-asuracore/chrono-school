import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobService, classService, teacherService, subjectService, savedTimetableService } from '../services/api';
import { Play, Loader2, CheckCircle2, XCircle, Calendar, Save, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import TimetableGrid from '../components/TimetableGrid';
import { SolveResponse, SavedTimetable, ScheduleEntry } from '../types';

const SchedulerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [localSchedule, setLocalSchedule] = useState<ScheduleEntry[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: savedTimetables } = useQuery({ 
    queryKey: ['saved-timetables'], 
    queryFn: savedTimetableService.getAll 
  });

  const { data: jobStatus } = useQuery({
    queryKey: ['job', activeJobId],
    queryFn: () => jobService.getStatus(activeJobId!),
    enabled: !!activeJobId && !result,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 2000;
    },
  });

  const createJobMutation = useMutation({
    mutationFn: jobService.create,
    onSuccess: (data) => {
      setActiveJobId(data.id);
      setResult(null);
    },
  });

  useEffect(() => {
    if (jobStatus?.status === 'COMPLETED' && activeJobId) {
      jobService.getResult(activeJobId).then(data => {
        setResult(data);
        setLocalSchedule(data.schedule);
      });
    }
  }, [jobStatus, activeJobId]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SavedTimetable>) => savedTimetableService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-timetables'] });
      setIsSaving(false);
      setSaveName('');
      alert('Timetable saved successfully!');
    },
  });

  const deleteSavedMutation = useMutation({
    mutationFn: savedTimetableService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-timetables'] }),
  });

  const generateSnapshot = () => {
    if (!teachers || !subjects || !classes) return null;
    return {
      teachers: [...teachers].sort((a, b) => a.id.localeCompare(b.id)).map(t => ({
        id: t.id,
        name: t.name,
        max_slots_per_week: t.max_slots_per_week,
        qualified_subjects: [...(t.qualified_subjects || [])].sort()
      })),
      subjects: [...subjects].sort((a, b) => a.id.localeCompare(b.id)).map(s => ({
        id: s.id,
        name: s.name,
        requires_double_period: s.requires_double_period
      })),
      classes: [...classes].sort((a, b) => a.id.localeCompare(b.id)).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        curriculum: [...(c.curriculum || [])].sort((a, b) => a.subject_id.localeCompare(b.subject_id))
      }))
    };
  };

  const handleSave = () => {
    if (!saveName) {
      alert('Please enter a name for the timetable');
      return;
    }
    const snapshot = generateSnapshot();
    if (!snapshot) return;

    saveMutation.mutate({
      name: saveName,
      data: localSchedule as any,
      input_snapshot: snapshot as any
    });
  };

  const loadTimetable = (saved: SavedTimetable) => {
    setResult({
      status: 'LOADED',
      solve_time_ms: 0,
      schedule: saved.data,
      unassigned_lessons: [] // We don't know unassigned lessons for saved ones unless we store them
    });
    setLocalSchedule(saved.data);
    setActiveJobId(null);
  };

  const isOutOfSync = (saved: SavedTimetable) => {
    if (!teachers || !subjects || !classes) return false;
    
    const snapshot = saved.input_snapshot;
    if (!snapshot) return false;

    const sortObjectKeys = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj).sort().reduce((acc: any, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
      }, {});
    };

    const currentSnapshot = generateSnapshot();
    return JSON.stringify(sortObjectKeys(snapshot)) !== JSON.stringify(sortObjectKeys(currentSnapshot));
  };

  const handleRefine = (pinned: any[]) => {
    const pre_assigned = pinned.map(p => ({
      day: p.day,
      slot_index: p.slot_index,
      class_id: p.class_id,
      subject_id: p.subject_id,
      teacher_id: p.teacher_id
    }));
    createJobMutation.mutate({ pre_assigned });
  };

  const calculateStats = () => {
    if (!result || !teachers || !classes) return null;

    const teacherAssignments: Record<string, number> = {};
    result.schedule.forEach(entry => {
      teacherAssignments[entry.teacher_id] = (teacherAssignments[entry.teacher_id] || 0) + 1;
    });

    const overloadedTeachers = teachers.filter(t => (teacherAssignments[t.id] || 0) > t.max_slots_per_week);
    const freeTeachers = teachers.filter(t => (teacherAssignments[t.id] || 0) === 0);

    const classFreeSlots: Record<string, number> = {};
    // Assuming 5 days * 8 slots = 40. Ideally this should come from settings.
    const TOTAL_SLOTS = 40; 

    classes.forEach(c => {
      const assignedCount = result.schedule.filter(s => s.class_id === c.id).length;
      classFreeSlots[c.id] = Math.max(0, TOTAL_SLOTS - assignedCount);
    });

    return {
      overloadedTeachers,
      freeTeachers,
      classFreeSlots,
      totalAssigned: result.schedule.length,
      unassignedCount: result.unassigned_lessons.reduce((acc, curr) => acc + curr.periods_missing, 0)
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Scheduler</h2>
          <p className="text-gray-500 mt-2 font-medium">Create and manage optimized school timetables</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {result && (
            <div className="flex items-center space-x-2 bg-white p-1.5 pl-4 rounded-full shadow-sm border border-gray-100">
              <input
                type="text"
                placeholder="Timetable Name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold w-40"
              />
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !saveName}
                className="flex items-center space-x-2 bg-brand-dark text-white px-6 py-2 rounded-full font-bold hover:brightness-125 transition-all disabled:opacity-50"
              >
                <Save size={18} />
                <span>Save</span>
              </button>
            </div>
          )}
          <button
            onClick={() => createJobMutation.mutate()}
            disabled={createJobMutation.isPending || (!!activeJobId && jobStatus?.status !== 'COMPLETED' && jobStatus?.status !== 'FAILED')}
            className="flex items-center space-x-3 bg-brand-primary text-brand-dark px-8 py-3.5 rounded-full font-black hover:brightness-95 transition-all shadow-lg disabled:opacity-50"
          >
            {createJobMutation.isPending || (activeJobId && !['COMPLETED', 'FAILED'].includes(jobStatus?.status || '')) ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Play fill="currentColor" size={24} />
            )}
            <span>Generate Schedule</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {activeJobId && (
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-sm border border-white flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Job Identifier</span>
                  <span className="text-sm font-bold text-gray-700">{activeJobId.substring(0, 8)}...</span>
                </div>
                <div className="h-10 w-px bg-gray-100"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                  <StatusBadge status={jobStatus?.status || 'PENDING'} />
                </div>
              </div>
              {jobStatus?.status === 'FAILED' && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-full border border-red-100">
                  <AlertTriangle size={18} />
                  <span className="text-sm font-bold">{jobStatus.error_message}</span>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {['OPTIMAL', 'FEASIBLE'].includes(result.status) ? (
                <div className="bg-brand-primary/10 border border-brand-primary/20 p-6 rounded-[2rem] flex items-center space-x-4 text-brand-dark">
                  <div className="bg-brand-primary p-3 rounded-2xl shadow-sm">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="font-black text-xl">Timetable Generated Successfully!</p>
                    <p className="text-sm font-bold opacity-70">Solved in {result.solve_time_ms}ms | Quality: {result.status}</p>
                  </div>
                </div>
              ) : result.status === 'LOADED' ? (
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center space-x-4 text-gray-800 shadow-sm">
                  <div className="bg-gray-100 p-3 rounded-2xl">
                    <Calendar size={28} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-black text-xl">Saved Timetable Loaded</p>
                    <p className="text-sm font-bold text-gray-400">Viewing archived schedule data</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] text-red-900 shadow-sm">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200">
                      <XCircle size={28} />
                    </div>
                    <div>
                      <p className="font-black text-2xl tracking-tight">Generation Infeasible</p>
                      <p className="text-sm font-bold text-red-400">Could not satisfy all constraints</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/50 p-6 rounded-3xl border border-red-100/50">
                      <p className="font-black text-xs uppercase tracking-widest text-red-400 mb-4">Possible Conflicts</p>
                      <ul className="space-y-3">
                        {result.validation_errors && result.validation_errors.length > 0 ? (
                          result.validation_errors.map((msg, i) => (
                            <li key={i} className="flex items-start text-sm font-bold text-red-800">
                              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-3 mt-1.5 shrink-0"></span>
                              {msg}
                            </li>
                          ))
                        ) : (
                          ['Teacher capacity exceeded', 'Slot availability restricted', 'Unsatisfiable curriculum'].map((msg, i) => (
                            <li key={i} className="flex items-center text-sm font-bold text-red-800">
                              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-3"></span>
                              {msg}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    {result.unassigned_lessons?.length > 0 && (
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100">
                        <p className="font-black text-xs uppercase tracking-widest text-red-400 mb-4">Unassigned Lessons</p>
                        <div className="space-y-2 max-h-40 overflow-auto pr-2">
                          {result.unassigned_lessons.map((ul, idx) => {
                            const className = classes?.find(c => c.id === ul.class_id)?.name || ul.class_id;
                            const subjectName = subjects?.find(s => s.id === ul.subject_id)?.name || ul.subject_id;
                            return (
                              <div key={idx} className="flex justify-between items-center bg-red-50/50 px-3 py-2 rounded-xl border border-red-100/30">
                                <span className="text-xs font-bold truncate">{className} - {subjectName}</span>
                                <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{ul.periods_missing}p</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {localSchedule.length > 0 && (
                <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white p-2 shadow-inner">
                  <TimetableGrid 
                    schedule={result.schedule} 
                    unassignedLessons={result.unassigned_lessons}
                    onRefine={handleRefine}
                    localSchedule={localSchedule}
                    setLocalSchedule={setLocalSchedule}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-brand-dark p-8 rounded-[2.5rem] shadow-xl text-white">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-lg flex items-center tracking-tight">
                <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-brand-primary/20">
                  <Calendar className="text-brand-dark" size={18} />
                </div>
                Saved
              </h3>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['saved-timetables'] })}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
              >
                <RefreshCw size={14} className={cn(queryClient.isFetching({ queryKey: ['saved-timetables'] }) ? 'animate-spin' : '')} />
              </button>
            </div>

            <div className="space-y-4">
              {!savedTimetables || savedTimetables.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Empty Vault</p>
                </div>
              ) : (
                savedTimetables.map((st) => {
                  const outOfSync = isOutOfSync(st);
                  return (
                    <div key={st.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group relative overflow-hidden">
                      {outOfSync && <div className="absolute top-0 right-0 w-2 h-2 bg-brand-primary rounded-bl-full"></div>}
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-sm truncate pr-2 tracking-tight">{st.name}</div>
                        <button 
                          onClick={() => deleteSavedMutation.mutate(st.id)}
                          className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500">
                          {new Date(st.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => loadTimetable(st)}
                          className="bg-brand-primary text-brand-dark px-4 py-1.5 rounded-full text-xs font-black hover:brightness-110 shadow-sm"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="bg-brand-secondary p-8 rounded-[2.5rem] border border-brand-primary/20">
            <h4 className="font-black text-brand-dark text-sm uppercase tracking-widest mb-6">Quick Stats</h4>
            {!stats ? (
              <div className="text-center py-8">
                <p className="text-xs font-bold text-brand-dark/40 italic">Generate a schedule to see insights</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-brand-dark/60">Overloaded Teachers</span>
                  <span className={cn("text-sm font-black", stats.overloadedTeachers.length > 0 ? "text-red-600" : "text-brand-dark")}>
                    {stats.overloadedTeachers.length}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-brand-dark/60">Free Teachers</span>
                  <span className="text-sm font-black text-brand-dark">{stats.freeTeachers.length}</span>
                </div>
                <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-brand-dark/60">Scheduled Lessons</span>
                  <span className="text-sm font-black text-brand-dark">{stats.totalAssigned}h</span>
                </div>
                <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-brand-dark/60">Total Unassigned</span>
                  <span className={cn("text-sm font-black", stats.unassignedCount > 0 ? "text-red-600" : "text-brand-dark")}>
                    {stats.unassignedCount}
                  </span>
                </div>
                
                <div className="pt-4 border-t border-brand-primary/10">
                  <p className="text-[10px] font-black text-brand-dark/40 uppercase tracking-widest mb-3">Free Slots by Class</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(stats.classFreeSlots).map(([classId, free]) => (
                      <div key={classId} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-brand-dark/70">{classes?.find(c => c.id === classId)?.name || classId}</span>
                        <span className="font-black text-brand-dark bg-white/60 px-2 py-0.5 rounded-lg">{free}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { icon: any, class: string }> = {
    PENDING: { icon: Loader2, class: 'bg-gray-100 text-gray-600' },
    PROCESSING: { icon: Loader2, class: 'bg-blue-100 text-blue-600 animate-pulse' },
    COMPLETED: { icon: CheckCircle2, class: 'bg-green-100 text-green-600' },
    FAILED: { icon: XCircle, class: 'bg-red-100 text-red-600' },
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
      <Icon size={12} className={`mr-1 ${status === 'PROCESSING' || status === 'PENDING' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
};

export default SchedulerPage;
