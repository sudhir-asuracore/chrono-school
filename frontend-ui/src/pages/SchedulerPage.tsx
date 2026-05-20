import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobService, classService, teacherService, subjectService, savedTimetableService } from '../services/api';
import { Play, Loader2, CheckCircle2, XCircle, Calendar, Save, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Scheduler Workspace</h2>
          <div className="flex space-x-2">
            {result && (
              <div className="flex items-center space-x-2 mr-4 border-r pr-4 border-gray-200">
                <input
                  type="text"
                  placeholder="Timetable Name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !saveName}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>
              </div>
            )}
            <button
              onClick={() => createJobMutation.mutate()}
              disabled={createJobMutation.isPending || (!!activeJobId && jobStatus?.status !== 'COMPLETED' && jobStatus?.status !== 'FAILED')}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {createJobMutation.isPending || (activeJobId && !['COMPLETED', 'FAILED'].includes(jobStatus?.status || '')) ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Play size={20} />
              )}
              <span>Generate Timetable</span>
            </button>
          </div>
        </div>

        {activeJobId && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="font-medium text-gray-700">Job ID: <span className="text-xs text-gray-400">{activeJobId}</span></div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 font-medium">Status:</span>
                <StatusBadge status={jobStatus?.status || 'PENDING'} />
              </div>
            </div>
            {jobStatus?.status === 'FAILED' && (
              <div className="text-sm text-red-600 font-medium">{jobStatus.error_message}</div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {['OPTIMAL', 'FEASIBLE'].includes(result.status) ? (
              <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center space-x-3 text-green-800">
                <CheckCircle2 size={24} />
                <div>
                  <p className="font-bold">Timetable Generated Successfully!</p>
                  <p className="text-sm opacity-90">Solve time: {result.solve_time_ms}ms | Status: {result.status}</p>
                </div>
              </div>
            ) : result.status === 'LOADED' ? (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center space-x-3 text-blue-800">
                <Calendar size={24} />
                <div>
                  <p className="font-bold">Saved Timetable Loaded</p>
                  <p className="text-sm opacity-90">You can now view, adjust, and re-run the solver if needed.</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center space-x-3 text-amber-800">
                <XCircle size={24} className="text-amber-600" />
                <div>
                  <p className="font-bold">Timetable Generation Infeasible</p>
                  <p className="text-sm opacity-90">
                    The solver could not find a valid schedule that satisfies all hard constraints.
                  </p>
                  <div className="mt-2 text-xs">
                    <p className="font-semibold">Possible reasons:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>Teachers assigned more periods than their max slots per week.</li>
                      <li>Not enough time slots to fit all required curriculum periods for a class.</li>
                      <li>Conflicting fixed breaks or complex double period requirements.</li>
                    </ul>
                  </div>

                  {result.unassigned_lessons?.length > 0 && (
                    <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
                      <p className="font-semibold text-xs mb-2">Unassigned Lessons (Partial Schedule Generated):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {result.unassigned_lessons.map((ul, idx) => {
                          const className = classes?.find(c => c.id === ul.class_id)?.name || ul.class_id;
                          const subjectName = subjects?.find(s => s.id === ul.subject_id)?.name || ul.subject_id;
                          return (
                            <div key={idx} className="flex justify-between text-[10px] border-b border-amber-200 pb-1">
                              <span className="truncate mr-2">{className} - {subjectName}</span>
                              <span className="font-bold text-amber-700 whitespace-nowrap">{ul.periods_missing} missing</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-xs mt-3 opacity-75">Status: {result.status} | Solve time: {result.solve_time_ms}ms</p>
                </div>
              </div>
            )}

            {localSchedule.length > 0 && (
              <TimetableGrid 
                schedule={result.schedule} 
                unassignedLessons={result.unassigned_lessons}
                onRefine={handleRefine}
                localSchedule={localSchedule}
                setLocalSchedule={setLocalSchedule}
              />
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center">
              <Calendar className="mr-2 text-indigo-600" size={20} />
              Saved Timetables
            </h3>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['saved-timetables'] })}
              className="text-gray-400 hover:text-indigo-600"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {!savedTimetables || savedTimetables.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No saved timetables yet.</p>
            ) : (
              savedTimetables.map((st) => {
                const outOfSync = isOutOfSync(st);
                return (
                  <div key={st.id} className="p-3 border rounded-lg hover:border-indigo-300 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-gray-800 truncate pr-2">{st.name}</div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => deleteSavedMutation.mutate(st.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[10px] text-gray-400">
                        {new Date(st.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center space-x-2">
                        {outOfSync && (
                          <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <AlertTriangle size={10} className="mr-1" />
                            Not in Sync
                          </span>
                        )}
                        <button
                          onClick={() => loadTimetable(st)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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
