import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { jobService, classService, teacherService, subjectService, savedTimetableService, roomService } from '../services/api';
import { Play, Loader2, CheckCircle2, XCircle, X, Calendar, Save, Trash2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { cn } from '../utils/cn';
import TimetableGrid from '../components/TimetableGrid';
import Modal from '../components/Modal';
import { SolveResponse, SavedTimetable, ScheduleEntry } from '../types';

const SchedulerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const timetableIdFromUrl = searchParams.get('id');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [loadedTimetableId, setLoadedTimetableId] = useState<string | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [localSchedule, setLocalSchedule] = useState<ScheduleEntry[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dismissedSuccess, setDismissedSuccess] = useState(false);
  const [expandedStat, setExpandedStat] = useState<'overloaded' | 'free' | 'unassigned' | 'classes' | null>(null);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);
  const [teacherVacations, setTeacherVacations] = useState<{teacher_id: string, day: string}[]>([]);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: roomService.getAll });
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
      setLoadedTimetableId(null);
      setResult(null);
      setSaveName('');
      setDismissedSuccess(false);
    },
  });

  useEffect(() => {
    if (timetableIdFromUrl && savedTimetables) {
      const saved = savedTimetables.find(t => t.id === timetableIdFromUrl);
      if (saved && loadedTimetableId !== saved.id) {
        loadTimetable(saved);
      }
    }
  }, [timetableIdFromUrl, savedTimetables, loadedTimetableId]);

  useEffect(() => {
    if (jobStatus?.status === 'COMPLETED' && activeJobId) {
      jobService.getResult(activeJobId).then(data => {
        setResult(data);
        setLocalSchedule(data.schedule);
        setSaveName(prev => {
          if (prev) return prev;
          const now = new Date();
          const dateStr = now.toLocaleDateString();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `Timetable - ${dateStr} ${timeStr}`;
        });
      });
    }
  }, [jobStatus, activeJobId]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SavedTimetable> & { id?: string }) => {
      if (data.id) {
        return savedTimetableService.update(data.id, data);
      }
      return savedTimetableService.create(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-timetables'] });
      setIsSaving(false);
      const isUpdate = !!variables.id;
      if (!isUpdate) {
        setLoadedTimetableId(data.id);
      }
      setNotification({
        isOpen: true,
        title: 'Timetable Saved',
        message: isUpdate ? 'Timetable updated successfully!' : 'Timetable saved successfully!',
        type: 'success'
      });
    },
  });

  const deleteSavedMutation = useMutation({
    mutationFn: savedTimetableService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-timetables'] }),
  });

  const generateSnapshot = () => {
    if (!teachers || !subjects || !classes || !rooms) return null;
    return {
      settings: {
        timeslots_per_day: 8,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        max_search_seconds: 60
      },
      teachers: [...teachers].sort((a, b) => a.id.localeCompare(b.id)).map(t => ({
        id: t.id,
        name: t.name,
        max_slots_per_week: t.max_slots_per_week,
        qualifications: [...(t.qualifications || [])].sort((a, b) => 
          a.subject_id.localeCompare(b.subject_id) || a.level_id.localeCompare(b.level_id)
        ),
        availability_matrix: t.availability_matrix
      })),
      subjects: [...subjects].sort((a, b) => a.id.localeCompare(b.id)).map(s => ({
        id: s.id,
        name: s.name,
        requires_double_period: s.requires_double_period,
        required_room_type: s.required_room_type
      })),
      rooms: [...rooms].sort((a, b) => a.id.localeCompare(b.id)).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type
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
      setNotification({
        isOpen: true,
        title: 'Missing Name',
        message: 'Please enter a name for the timetable',
        type: 'warning'
      });
      return;
    }
    const snapshot = generateSnapshot();
    if (!snapshot) return;

    saveMutation.mutate({
      id: loadedTimetableId || undefined,
      name: saveName,
      data: localSchedule as any,
      input_snapshot: snapshot as any
    });
  };

  const handleGenerate = (config?: { holidays: string[], teacher_vacations: {teacher_id: string, day: string}[] }) => {
    // Collect pinned lessons from current schedule to preserve them
    const pinned = localSchedule.filter(e => e.is_pinned).map(p => ({
      day: p.day,
      slot_index: p.slot_index,
      class_id: p.class_id,
      subject_id: p.subject_id,
      teacher_id: p.teacher_id,
      room_id: p.room_id
    }));

    createJobMutation.mutate({ 
      pre_assigned: pinned,
      holidays: config?.holidays.map(day => ({ day })) || [],
      teacher_vacations: config?.teacher_vacations || []
    });
    setShowConfigModal(false);
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
    setLoadedTimetableId(saved.id);
    setSaveName(saved.name);
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
      teacher_id: p.teacher_id,
      room_id: p.room_id
    }));
    createJobMutation.mutate({ 
      pre_assigned,
      holidays: selectedHolidays.map(day => ({ day })),
      teacher_vacations: teacherVacations
    });
  };

  const calculateStats = () => {
    if (!teachers || !classes) return null;

    const teacherAssignments: Record<string, number> = {};
    localSchedule.forEach(entry => {
      teacherAssignments[entry.teacher_id] = (teacherAssignments[entry.teacher_id] || 0) + 1;
    });

    const overloadedTeachers = teachers.filter(t => (teacherAssignments[t.id] || 0) > t.max_slots_per_week);
    const freeTeachers = teachers.filter(t => (teacherAssignments[t.id] || 0) === 0);

    const classFreeSlots: Record<string, number> = {};
    // Assuming 5 days * 8 slots = 40. Ideally this should come from settings.
    const TOTAL_SLOTS = 40;

    classes.forEach(c => {
      const assignedCount = localSchedule.filter(s => s.class_id === c.id).length;
      classFreeSlots[c.id] = Math.max(0, TOTAL_SLOTS - assignedCount);
    });

    // Recalculate unassigned lessons based on curriculum vs localSchedule
    let unassignedCount = 0;
    const unassignedDetails: { class_id: string; subject_id: string; periods_missing: number }[] = [];
    classes.forEach(c => {
      c.curriculum.forEach(item => {
        const assigned = localSchedule.filter(s => s.class_id === c.id && s.subject_id === item.subject_id).length;
        const missing = Math.max(0, item.periods_per_week - assigned);
        if (missing > 0) {
          unassignedCount += missing;
          unassignedDetails.push({ class_id: c.id, subject_id: item.subject_id, periods_missing: missing });
        }
      });
    });

    return {
      overloadedTeachers,
      freeTeachers,
      classFreeSlots,
      totalAssigned: localSchedule.length,
      unassignedCount,
      unassignedDetails,
      teacherAssignments
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
          <div className="relative">
            <div className="flex items-center space-x-2 bg-white p-1.5 pl-4 rounded-full shadow-sm border border-gray-100 min-w-[320px]">
              <Calendar className="text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Select or name timetable"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onFocus={() => setShowSavedDropdown(true)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold flex-1"
              />
              <button
                onClick={() => setShowSavedDropdown(!showSavedDropdown)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronDown size={18} className={cn("text-gray-400 transition-transform duration-200", showSavedDropdown && "rotate-180")} />
              </button>

              {result && (
                <div className="flex items-center">
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !saveName}
                    className="flex items-center space-x-2 bg-brand-dark text-white px-6 py-2 rounded-full font-bold hover:brightness-125 transition-all disabled:opacity-50 ml-2 shadow-sm"
                  >
                    <Save size={18} />
                    <span>{loadedTimetableId ? 'Update' : 'Save'}</span>
                  </button>
                  {loadedTimetableId && (
                    <button
                      onClick={() => {
                        setLoadedTimetableId(null);
                        setSaveName(prev => `${prev} (Copy)`);
                        setNotification({
                          isOpen: true,
                          title: 'Copy Mode',
                          message: 'You are now editing a copy. Change the name and click Save.',
                          type: 'success'
                        });
                      }}
                      title="Save as Copy"
                      className="ml-2 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-all"
                    >
                      <Copy size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {showSavedDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSavedDropdown(false)}></div>
                <div className="absolute top-full right-0 lg:left-0 mt-3 w-80 bg-brand-dark rounded-[2.5rem] shadow-2xl z-50 p-6 text-white border border-white/10 animate-in fade-in zoom-in-95 duration-200 origin-top">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Saved Vault</h3>
                    <button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['saved-timetables'] })}
                      className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <RefreshCw size={14} className={cn(queryClient.isFetching({ queryKey: ['saved-timetables'] }) ? 'animate-spin' : '')} />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2 custom-scrollbar">
                    {!savedTimetables || savedTimetables.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-white/10 rounded-3xl">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Empty Vault</p>
                      </div>
                    ) : (
                      savedTimetables.map((st) => {
                        const outOfSync = isOutOfSync(st);
                        return (
                          <div key={st.id} className="p-4 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group relative overflow-hidden">
                            {outOfSync && <div className="absolute top-0 right-0 w-2 h-2 bg-brand-primary rounded-bl-full"></div>}
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-sm truncate pr-2 tracking-tight">{st.name}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSavedMutation.mutate(st.id);
                                }}
                                className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-white/30">
                                {new Date(st.created_at).toLocaleDateString()}
                              </span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    loadTimetable(st);
                                    setShowSavedDropdown(false);
                                  }}
                                  className="bg-brand-primary text-brand-dark px-4 py-1.5 rounded-full text-[11px] font-black hover:brightness-110 shadow-sm transition-all active:scale-95"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => {
                                    loadTimetable(st);
                                    setLoadedTimetableId(null);
                                    setSaveName(`${st.name} (Copy)`);
                                    setShowSavedDropdown(false);
                                    setNotification({
                                      isOpen: true,
                                      title: 'Copy Mode',
                                      message: 'You are now editing a copy. Change the name and click Save.',
                                      type: 'success'
                                    });
                                  }}
                                  title="Load as Copy"
                                  className="bg-white/10 text-white p-1.5 rounded-full hover:bg-white/20 transition-all active:scale-95"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
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

      <div className="space-y-8">
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
              {loadedTimetableId && savedTimetables?.find(t => t.id === loadedTimetableId)?.is_stale && (
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-[2rem] flex items-center justify-between text-orange-900 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg shadow-orange-200">
                      <AlertTriangle size={28} />
                    </div>
                    <div>
                      <p className="font-black text-xl">Stale Timetable Detected</p>
                      <p className="text-sm font-bold opacity-70">Some entries in this timetable have been deleted from the system. Highlighted slots indicate affected data.</p>
                    </div>
                  </div>
                </div>
              )}

              {['OPTIMAL', 'FEASIBLE'].includes(result.status) ? (
                !dismissedSuccess && (
                  <div className="bg-brand-primary/10 border border-brand-primary/20 p-6 rounded-[2rem] flex items-center justify-between text-brand-dark">
                    <div className="flex items-center space-x-4">
                      <div className="bg-brand-primary p-3 rounded-2xl shadow-sm">
                        <CheckCircle2 size={28} />
                      </div>
                      <div>
                        <p className="font-black text-xl">Timetable Generated Successfully!</p>
                        <p className="text-sm font-bold opacity-70">Solved in {result.solve_time_ms}ms | Quality: {result.status}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setDismissedSuccess(true)}
                      className="p-2 hover:bg-brand-primary/20 rounded-full transition-colors"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )
              ) : result.status === 'LOADED' ? null : (
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

              {stats && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="bg-white/40 backdrop-blur-md p-2 rounded-[2rem] border border-white shadow-inner flex items-center overflow-x-auto no-scrollbar">
                    <div className="flex items-center space-x-1 p-1 w-full">
                      <button
                        onClick={() => setExpandedStat(expandedStat === 'overloaded' ? null : 'overloaded')}
                        className={cn(
                          "flex-1 flex items-center justify-between px-6 py-3 rounded-[1.5rem] transition-all whitespace-nowrap",
                          expandedStat === 'overloaded' ? "bg-brand-dark text-white shadow-lg" : "hover:bg-white/60 text-brand-dark"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Overloaded</span>
                        <span className={cn("text-lg font-black ml-4", stats.overloadedTeachers.length > 0 && expandedStat !== 'overloaded' ? "text-red-500" : "")}>
                          {stats.overloadedTeachers.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setExpandedStat(expandedStat === 'free' ? null : 'free')}
                        className={cn(
                          "flex-1 flex items-center justify-between px-6 py-3 rounded-[1.5rem] transition-all whitespace-nowrap",
                          expandedStat === 'free' ? "bg-brand-dark text-white shadow-lg" : "hover:bg-white/60 text-brand-dark"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Free Teachers</span>
                        <span className="text-lg font-black ml-4">{stats.freeTeachers.length}</span>
                      </button>

                      <div className="flex-1 flex items-center justify-between px-6 py-3 text-brand-dark whitespace-nowrap">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Scheduled</span>
                        <span className="text-lg font-black ml-4">{stats.totalAssigned}h</span>
                      </div>

                      <button
                        onClick={() => setExpandedStat(expandedStat === 'unassigned' ? null : 'unassigned')}
                        className={cn(
                          "flex-1 flex items-center justify-between px-6 py-3 rounded-[1.5rem] transition-all whitespace-nowrap",
                          expandedStat === 'unassigned' ? "bg-brand-dark text-white shadow-lg" : "hover:bg-white/60 text-brand-dark"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Unassigned</span>
                        <span className={cn("text-lg font-black ml-4", stats.unassignedCount > 0 && expandedStat !== 'unassigned' ? "text-red-500" : "")}>
                          {stats.unassignedCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setExpandedStat(expandedStat === 'classes' ? null : 'classes')}
                        className={cn(
                          "flex-1 flex items-center justify-between px-6 py-3 rounded-[1.5rem] transition-all whitespace-nowrap",
                          expandedStat === 'classes' ? "bg-brand-dark text-white shadow-lg" : "hover:bg-white/60 text-brand-dark"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Class Load</span>
                        <ChevronDown size={14} className={cn("ml-2 opacity-40 transition-transform duration-200", expandedStat === 'classes' && "rotate-180")} />
                      </button>
                    </div>
                  </div>

                  {expandedStat && (
                    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      {expandedStat === 'overloaded' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {stats.overloadedTeachers.length > 0 ? stats.overloadedTeachers.map(t => (
                            <div key={t.id} className="bg-white/50 p-4 rounded-2xl border border-red-100 flex justify-between items-center">
                              <span className="font-bold text-gray-700">{t.name}</span>
                              <span className="font-black text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs">{stats.teacherAssignments[t.id]} / {t.max_slots_per_week}h</span>
                            </div>
                          )) : (
                            <div className="col-span-full py-8 text-center">
                              <p className="text-sm font-bold text-gray-400 italic">No overloaded teachers. Perfect balance!</p>
                            </div>
                          )}
                        </div>
                      )}

                      {expandedStat === 'free' && (
                        <div className="flex flex-wrap gap-2">
                          {stats.freeTeachers.length > 0 ? stats.freeTeachers.map(t => (
                            <span key={t.id} className="bg-white/50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-bold text-gray-700">{t.name}</span>
                          )) : (
                            <p className="w-full text-sm font-bold text-gray-400 text-center italic">All teachers are fully utilized.</p>
                          )}
                        </div>
                      )}

                      {expandedStat === 'unassigned' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {stats.unassignedCount > 0 ? stats.unassignedDetails.map((ul, idx) => (
                            <div key={idx} className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">{classes?.find(c => c.id === ul.class_id)?.name}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{subjects?.find(s => s.id === ul.subject_id)?.name}</span>
                              </div>
                              <span className="font-black text-red-600 bg-white px-3 py-1 rounded-full text-xs">{ul.periods_missing}h missing</span>
                            </div>
                          )) : (
                            <div className="col-span-full py-8 text-center">
                              <p className="text-sm font-bold text-gray-400 italic">All lessons have been successfully assigned!</p>
                            </div>
                          )}
                        </div>
                      )}

                      {expandedStat === 'classes' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {Object.entries(stats.classFreeSlots).map(([classId, free]) => (
                            <div key={classId} className="bg-white/50 p-3 rounded-2xl border border-gray-100 text-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{classes?.find(c => c.id === classId)?.name || classId}</p>
                              <p className="text-lg font-black text-brand-dark">{free}h free</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {localSchedule.length > 0 && (
                <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white p-2 shadow-inner">
                  <TimetableGrid
                    schedule={result.schedule}
                    unassignedLessons={stats.unassignedDetails}
                    onRefine={handleRefine}
                    localSchedule={localSchedule}
                    setLocalSchedule={setLocalSchedule}
                    timetableId={loadedTimetableId || activeJobId || undefined}
                  />
                </div>
              )}
            </div>
          )}
      </div>

      {/* Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Generation Settings"
      >
        <div className="space-y-8">
          {/* Holidays */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
              <Calendar size={16} className="mr-2" />
              Weekly Holidays
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedHolidays(prev => 
                      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                    );
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                    selectedHolidays.includes(day) 
                      ? "bg-brand-primary border-brand-primary text-brand-dark" 
                      : "bg-white border-gray-100 text-gray-400 hover:border-brand-primary/30"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Selected days will have no lessons scheduled for any class or teacher.</p>
          </div>

          {/* Teacher Vacations */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
              <Calendar size={16} className="mr-2" />
              Teacher Vacations
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {teachers?.map(teacher => (
                <div key={teacher.id} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-black text-gray-700 mb-3">{teacher.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => {
                      const isVacation = teacherVacations.some(v => v.teacher_id === teacher.id && v.day === day);
                      const isHoliday = selectedHolidays.includes(day);
                      return (
                        <button
                          key={day}
                          disabled={isHoliday}
                          onClick={() => {
                            setTeacherVacations(prev => 
                              isVacation 
                                ? prev.filter(v => !(v.teacher_id === teacher.id && v.day === day))
                                : [...prev, { teacher_id: teacher.id, day }]
                            );
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border",
                            isVacation 
                              ? "bg-brand-dark border-brand-dark text-white" 
                              : "bg-white border-gray-100 text-gray-400 hover:border-brand-dark/30",
                            isHoliday && "opacity-30 cursor-not-allowed"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col space-y-3">
            <button
              onClick={() => handleGenerate({ holidays: selectedHolidays, teacher_vacations: teacherVacations })}
              className="w-full bg-brand-primary text-brand-dark py-4 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2"
            >
              <Play size={20} fill="currentColor" />
              <span>Generate Schedule</span>
            </button>
            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification Modal */}
      <Modal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
      >
        <div className="space-y-6">
          <div className={cn(
            "p-8 rounded-[2rem] border flex flex-col items-center text-center",
            notification.type === 'success' ? "bg-brand-primary/10 border-brand-primary/20" : 
            notification.type === 'warning' ? "bg-orange-50 border-orange-100" :
            "bg-red-50 border-red-100"
          )}>
            <div className={cn(
              "p-4 rounded-full mb-4 shadow-sm",
              notification.type === 'success' ? "bg-brand-primary text-brand-dark" :
              notification.type === 'warning' ? "bg-orange-500 text-white" :
              "bg-red-500 text-white"
            )}>
              {notification.type === 'success' ? <CheckCircle2 size={40} /> :
               notification.type === 'warning' ? <AlertTriangle size={40} /> :
               <XCircle size={40} />}
            </div>
            <p className={cn(
              "text-xl font-black",
              notification.type === 'success' ? "text-brand-dark" :
              notification.type === 'warning' ? "text-orange-900" :
              "text-red-900"
            )}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification({ ...notification, isOpen: false })}
            className="w-full bg-brand-primary text-brand-dark py-4 rounded-2xl font-black hover:brightness-110 transition-all shadow-lg active:scale-95"
          >
            Got it
          </button>
        </div>
      </Modal>
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
