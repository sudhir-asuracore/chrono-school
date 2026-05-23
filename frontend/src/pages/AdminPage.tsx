import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, AlertCircle, CheckCircle2, Trash2, ShieldAlert, Layers, Edit2, Plus, X } from 'lucide-react';
import { subjectService, teacherService, classService, adminService, roomService, levelService } from '../services/api';
import { cn } from '../utils/cn';
import { getNextUnusedColor } from '../utils/colors';

const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [clearOptions, setClearOptions] = useState({
    teachers: false,
    subjects: false,
    classes: false,
    rooms: false,
    levels: false,
    timetables: false,
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const [editingLevel, setEditingLevel] = useState<{ id: string, name: string } | null>(null);
  const [newLevelName, setNewLevelName] = useState('');

  useEffect(() => {
    if (importStatus) {
      const timer = setTimeout(() => {
        setImportStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [importStatus]);

  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: roomService.getAll });
  const { data: levels } = useQuery({ queryKey: ['levels'], queryFn: levelService.getAll });

  const handleExport = () => {
    const subjectMap = new Map((subjects || []).map(s => [s.id, s.name]));
    const levelMap = new Map((levels || []).map(l => [l.id, l.name]));

    // Transform to human-friendly format with name-based references
    const exportedSubjects = subjects?.map(({ id, organization_id, created_at, color, ...s }) => s) || [];

    const exportedTeachers = teachers?.map(({ id, organization_id, created_at, color, qualified_subjects, qualifications, ...t }) => ({
      ...t,
      qualifications: (qualifications || []).map(q => ({
        subject_name: subjectMap.get(q.subject_id) || q.subject_id,
        level_name: levelMap.get(q.level_id) || q.level_id
      }))
    })) || [];

    const exportedClasses = classes?.map(({ id, organization_id, created_at, level_id, curriculum, ...c }) => ({
      ...c,
      level_name: level_id ? levelMap.get(level_id) : undefined,
      curriculum: (curriculum || []).map(({ subject_id, ...item }) => ({
        ...item,
        subject_name: subjectMap.get(subject_id) || subject_id
      }))
    })) || [];

    const exportedRooms = rooms?.map(({ id, organization_id, created_at, ...r }) => r) || [];
    const exportedLevels = levels?.map(({ id, organization_id, created_at, ...l }) => l) || [];

    const data = {
      subjects: exportedSubjects,
      teachers: exportedTeachers,
      rooms: exportedRooms,
      classes: exportedClasses,
      levels: exportedLevels,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronoschool-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.subjects || !data.teachers || !data.classes || !data.rooms) {
          throw new Error('Invalid file format. Must contain subjects, teachers, rooms, and classes.');
        }

        // Import sequence to respect dependencies
        let successCount = 0;
        let failCount = 0;

        // 0. Rooms - Create all rooms first
        let currentRooms = await roomService.getAll() || [];
        let roomNames = new Set(currentRooms.map(r => r.name.toLowerCase()));

        if (data.rooms) {
          for (const r of data.rooms) {
            try {
              if (roomNames.has(r.name.toLowerCase())) {
                successCount++;
                continue;
              }
              await roomService.create(r);
              successCount++;
            } catch (err) {
              console.error('Failed to import room', r, err);
              failCount++;
            }
          }
        }

        // 0.5. Levels - Create all levels
        let currentLevels = await levelService.getAll() || [];
        let levelNameToId = new Map(currentLevels.map(l => [l.name.toLowerCase(), l.id]));

        if (data.levels) {
          for (const l of data.levels) {
            try {
              if (levelNameToId.has(l.name.toLowerCase())) {
                successCount++;
                continue;
              }
              const newLevel = await levelService.create(l);
              levelNameToId.set(l.name.toLowerCase(), newLevel.id);
              successCount++;
            } catch (err) {
              console.error('Failed to import level', l, err);
              failCount++;
            }
          }
        }

        // Refresh levels to be sure we have IDs
        currentLevels = await levelService.getAll() || [];
        levelNameToId = new Map(currentLevels.map(l => [l.name.toLowerCase(), l.id]));

        // 1. Subjects - Create all subjects first
        let currentSubjects = await subjectService.getAll() || [];
        let subjectNameToId = new Map(currentSubjects.map(s => [s.name.toLowerCase(), s.id]));
        let usedSubjectColors = currentSubjects.map(s => s.color).filter(Boolean) as string[];

        for (const s of data.subjects) {
          try {
            if (subjectNameToId.has(s.name.toLowerCase())) {
              successCount++;
              continue;
            }

            const subjectData = { ...s };
            if (!subjectData.color) {
              subjectData.color = getNextUnusedColor(usedSubjectColors);
              usedSubjectColors.push(subjectData.color);
            }

            const newSubject = await subjectService.create(subjectData);
            subjectNameToId.set(s.name.toLowerCase(), newSubject.id);
            successCount++;
          } catch (err) {
            console.error('Failed to import subject', s, err);
            failCount++;
          }
        }

        // Refresh subjects to be sure we have IDs for all (newly created and existing)
        currentSubjects = await subjectService.getAll() || [];
        subjectNameToId = new Map(currentSubjects.map(s => [s.name.toLowerCase(), s.id]));

        // 2. Teachers - Resolve subject names to IDs
        const currentTeachers = await teacherService.getAll() || [];
        const teacherNames = new Set(currentTeachers.map(t => t.name.toLowerCase()));
        let usedTeacherColors = currentTeachers.map(t => t.color).filter(Boolean) as string[];

        for (const t of data.teachers) {
          try {
            if (teacherNames.has(t.name.toLowerCase())) {
              successCount++;
              continue;
            }
            const teacherData = {
              ...t,
              qualifications: (t.qualifications || []).map((q: any) => ({
                subject_id: subjectNameToId.get((q.subject_name || q.subject_id).toLowerCase()) || q.subject_id,
                level_id: levelNameToId.get((q.level_name || q.level_id).toLowerCase()) || q.level_id
              }))
            };

            if (!teacherData.color) {
              teacherData.color = getNextUnusedColor(usedTeacherColors);
              usedTeacherColors.push(teacherData.color);
            }

            await teacherService.create(teacherData);
            successCount++;
          } catch (err) {
            console.error('Failed to import teacher', t, err);
            failCount++;
          }
        }

        // 3. Classes - Resolve subject names in curriculum to IDs and level names to IDs
        const currentClasses = await classService.getAll() || [];
        const classNames = new Set(currentClasses.map(c => c.name.toLowerCase()));

        for (const c of data.classes) {
          try {
            if (classNames.has(c.name.toLowerCase())) {
              successCount++;
              continue;
            }
            const classData = {
              ...c,
              level_id: c.level_name ? levelNameToId.get(c.level_name.toLowerCase()) : c.level_id,
              curriculum: (c.curriculum || []).map((item: any) => ({
                periods_per_week: item.periods_per_week,
                binding_id: item.binding_id,
                subject_id: subjectNameToId.get((item.subject_name || item.subject_id).toLowerCase()) || item.subject_id
              }))
            };
            await classService.create(classData);
            successCount++;
          } catch (err) {
            console.error('Failed to import class', c, err);
            failCount++;
          }
        }

        if (failCount === 0) {
          setImportStatus({ type: 'success', message: `Data imported successfully! (${successCount} items)` });
        } else {
          setImportStatus({
            type: 'error',
            message: `Import partially completed. Success: ${successCount}, Failed: ${failCount}. Some items might already exist.`
          });
        }

        queryClient.invalidateQueries({ queryKey: ['subjects'] });
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        queryClient.invalidateQueries({ queryKey: ['classes'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['levels'] });
      } catch (err: any) {
        setImportStatus({ type: 'error', message: err.message || 'Failed to import data.' });
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (!clearOptions.teachers && !clearOptions.subjects && !clearOptions.classes && !clearOptions.rooms && !clearOptions.levels && !clearOptions.timetables) {
      alert("Please select at least one item to clear.");
      return;
    }

    setIsClearing(true);
    try {
      await adminService.clearData(clearOptions);
      setImportStatus({ type: 'success', message: 'Selected data cleared successfully!' });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      queryClient.invalidateQueries({ queryKey: ['saved-timetables'] });
      if (clearOptions.timetables) {
        localStorage.removeItem('dashboard_selected_timetable_id');
        localStorage.removeItem('dashboard_selected_class_id');
      }
      setClearOptions({ teachers: false, subjects: false, classes: false, rooms: false, levels: false, timetables: false });
    } catch (err: any) {
      setImportStatus({ type: 'error', message: err.response?.data?.error || 'Failed to clear data.' });
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  const handleAddLevel = async () => {
    if (!newLevelName.trim()) return;
    try {
      await levelService.create({ name: newLevelName });
      setNewLevelName('');
      queryClient.invalidateQueries({ queryKey: ['levels'] });
    } catch (err) {
      console.error('Failed to create level', err);
    }
  };

  const handleUpdateLevel = async () => {
    if (!editingLevel || !editingLevel.name.trim()) return;
    try {
      await levelService.update(editingLevel.id, { name: editingLevel.name });
      setEditingLevel(null);
      queryClient.invalidateQueries({ queryKey: ['levels'] });
    } catch (err) {
      console.error('Failed to update level', err);
    }
  };

  const handleDeleteLevel = async (id: string) => {
    try {
      await levelService.delete(id);
      queryClient.invalidateQueries({ queryKey: ['levels'] });
    } catch (err) {
      console.error('Failed to delete level', err);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Administration</h2>
        <p className="text-gray-500 mt-2 font-medium">Data management and system maintenance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] shadow-sm border border-white hover:shadow-md transition-all">
          <div className="flex items-center space-x-4 mb-6 text-brand-dark">
            <div className="bg-brand-secondary p-3 rounded-2xl">
              <Download size={24} />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Export Data</h3>
          </div>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Download all school records (teachers, subjects, and classes) as a portable JSON file.
          </p>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center space-x-3 bg-brand-dark text-white py-4 px-6 rounded-full font-black hover:brightness-125 transition-all shadow-lg"
          >
            <Download size={18} />
            <span>DOWNLOAD JSON</span>
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] shadow-sm border border-white hover:shadow-md transition-all">
          <div className="flex items-center space-x-4 mb-6 text-brand-dark">
            <div className="bg-brand-primary p-3 rounded-2xl shadow-sm">
              <Upload size={24} />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Import Data</h3>
          </div>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Upload school data. records with existing IDs will be skipped to prevent duplicates.
          </p>
          <label className={cn(
            "w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-full transition-all cursor-pointer border-2 border-dashed font-black uppercase text-sm tracking-widest",
            isImporting ? "bg-gray-50 border-gray-200 cursor-not-allowed text-gray-400" : "border-brand-primary bg-brand-secondary/30 text-brand-dark hover:bg-brand-secondary/50"
          )}>
            <Upload size={18} />
            <span>{isImporting ? 'IMPORTING...' : 'SELECT FILE'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-white">
        <div className="flex items-center space-x-4 mb-8 text-brand-dark">
          <div className="bg-brand-secondary p-3 rounded-2xl">
            <Layers size={24} />
          </div>
          <h3 className="text-2xl font-black tracking-tight">Manage Educational Levels</h3>
        </div>
        
        <div className="space-y-4 max-w-2xl">
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="e.g. Primary, Secondary, High School"
              className="flex-1 rounded-full border border-gray-200 px-6 py-3 focus:border-brand-primary focus:ring-brand-primary font-medium"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
            />
            <button
              onClick={handleAddLevel}
              className="bg-brand-primary text-brand-dark px-8 rounded-full font-black hover:brightness-95 transition-all shadow-sm flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>ADD</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {levels?.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm group">
                {editingLevel?.id === l.id ? (
                  <div className="flex items-center space-x-2 w-full">
                    <input
                      autoFocus
                      className="flex-1 bg-gray-50 border-none focus:ring-0 rounded-full px-3 py-1 text-sm font-bold"
                      value={editingLevel.name}
                      onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateLevel()}
                    />
                    <button onClick={handleUpdateLevel} className="text-brand-dark font-black text-xs bg-brand-primary px-3 py-1 rounded-full">SAVE</button>
                    <button onClick={() => setEditingLevel(null)} className="text-gray-400"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-gray-700 ml-2">{l.name}</span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingLevel({ id: l.id, name: l.name })}
                        className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-brand-secondary rounded-full"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(l.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-md p-10 rounded-[2.5rem] shadow-sm border border-white">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 text-red-600">
            <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
              <Trash2 size={24} />
            </div>
            <h3 className="text-2xl font-black tracking-tight">System Purge</h3>
          </div>
          <button
            onClick={() => {
              const allSelected = clearOptions.teachers && clearOptions.subjects && clearOptions.classes && clearOptions.rooms && clearOptions.levels && clearOptions.timetables;
              setClearOptions({
                teachers: !allSelected,
                subjects: !allSelected,
                classes: !allSelected,
                rooms: !allSelected,
                levels: !allSelected,
                timetables: !allSelected
              });
            }}
            className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full border border-red-100 text-red-600 hover:bg-red-50 transition-all"
          >
            {clearOptions.teachers && clearOptions.subjects && clearOptions.classes && clearOptions.rooms && clearOptions.levels && clearOptions.timetables ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { id: 'teachers', label: 'Teachers' },
            { id: 'subjects', label: 'Subjects' },
            { id: 'classes', label: 'Classes' },
            { id: 'rooms', label: 'Rooms' },
            { id: 'levels', label: 'Levels' },
            { id: 'timetables', label: 'Timetables' }
          ].map(opt => (
            <label key={opt.id} className={cn(
              "flex items-center justify-between p-4 rounded-3xl border-2 cursor-pointer transition-all",
              (clearOptions as any)[opt.id]
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-white border-gray-100 text-gray-400 hover:border-red-100"
            )}>
              <span className="font-black text-sm uppercase tracking-widest">{opt.label}</span>
                <input
                  type="checkbox"
                  checked={(clearOptions as any)[opt.id]}
                  onChange={(e) => setClearOptions({...clearOptions, [opt.id]: e.target.checked})}
                  className="w-5 h-5 rounded-full text-red-600 focus:ring-red-500 border border-gray-200"
                />
            </label>
          ))}
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!clearOptions.teachers && !clearOptions.subjects && !clearOptions.classes && !clearOptions.rooms && !clearOptions.levels && !clearOptions.timetables}
          className="flex items-center justify-center space-x-3 bg-red-600 text-white py-4 px-10 rounded-full font-black hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
        >
          <AlertCircle size={20} />
          <span>WIPE SELECTED DATA</span>
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 border border-white animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Are you sure?</h3>
              <p className="text-gray-500 font-medium mb-10">
                This action is irreversible. All selected data and existing timetables will be permanently removed from the system.
              </p>
              <div className="flex w-full space-x-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-full font-black text-sm tracking-widest hover:bg-gray-200 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleClearData}
                  disabled={isClearing}
                  className="flex-1 py-4 bg-red-600 text-white rounded-full font-black text-sm tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  {isClearing ? 'WIPING...' : 'CONFIRM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importStatus && (
        <div className={cn(
          "fixed top-8 left-1/2 -translate-x-1/2 z-[100] p-6 rounded-[2rem] flex items-center space-x-4 animate-in slide-in-from-top-4 duration-300 shadow-2xl backdrop-blur-md",
          importStatus.type === 'success'
            ? "bg-brand-primary/90 text-brand-dark border border-brand-primary/30"
            : "bg-red-50/90 text-red-900 border border-red-100"
        )}>
          <div className={cn(
            "p-2 rounded-xl shadow-sm",
            importStatus.type === 'success' ? "bg-brand-primary" : "bg-red-500 text-white"
          )}>
            {importStatus.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-widest">{importStatus.type === 'success' ? 'Success' : 'Error Alert'}</p>
            <p className="font-medium text-sm mt-0.5">{importStatus.message}</p>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="ml-4 p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
