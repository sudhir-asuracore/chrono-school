import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, teacherService, subjectService, roomService, substitutionService } from '../services/api';
import { ScheduleEntry, Teacher } from '../types';
import { Filter, Pin, PinOff, PlusCircle, XCircle, Search, ChevronRight, RefreshCw, Info, UserPlus, Download, Loader2, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from './Modal';
import { cn } from '../utils/cn';

interface TimetableGridProps {
  schedule: ScheduleEntry[];
  unassignedLessons?: { class_id: string; subject_id: string; periods_missing: number }[];
  onRefine?: (pinned: ScheduleEntry[]) => void;
  localSchedule: ScheduleEntry[];
  setLocalSchedule: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  timetableId?: string;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({
  schedule,
  unassignedLessons = [],
  onRefine,
  localSchedule,
  setLocalSchedule,
  timetableId
}) => {
  const queryClient = useQueryClient();
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: roomService.getAll });

  const [filterType, setFilterType] = useState<'class' | 'teacher'>('class');
  const [filterId, setFilterId] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<{ day: string, slot: number } | null>(null);
  const [selectedUnassigned, setSelectedUnassigned] = useState<{ class_id: string; subject_id: string } | null>(null);
  const [manualAddData, setManualAddData] = useState<{ day: string, slot: number } | null>(null);
  const [manualEntry, setManualEntry] = useState<{ class_id: string, subject_id: string, teacher_id: string, room_id?: string }>({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    room_id: ''
  });
  const [substitutionEntry, setSubstitutionEntry] = useState<ScheduleEntry | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xls'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const selectedClass = React.useMemo(() =>
    classes?.find(c => c.id === manualEntry.class_id),
  [classes, manualEntry.class_id]);

  const displaySubjects = React.useMemo(() => {
    return subjects || [];
  }, [subjects]);

  const displayTeachers = React.useMemo(() => {
    return teachers || [];
  }, [teachers]);

  const days = React.useMemo(() => {
    if (localSchedule.length > 0) {
      const scheduleDays = Array.from(new Set(localSchedule.map(e => e.day)));
      // Try to preserve common order if possible
      const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Week A - Mon", "Week A - Tue", "Week B - Mon"];
      return scheduleDays.sort((a, b) => {
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b);
      });
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  }, [localSchedule]);

  const slots = React.useMemo(() => {
    const maxSlot = localSchedule.reduce((max, e) => Math.max(max, e.slot_index), 7);
    return Array.from({ length: maxSlot + 1 }, (_, i) => i);
  }, [localSchedule]);

  // Initialize filterId if not set
  React.useEffect(() => {
    if (!filterId) {
      if (filterType === 'class' && classes?.length) setFilterId(classes[0].id);
      else if (filterType === 'teacher' && teachers?.length) setFilterId(teachers[0].id);
    }
  }, [filterType, classes, teachers, filterId]);

  const filteredSchedule = localSchedule.filter(entry =>
    filterType === 'class' ? entry.class_id === filterId : entry.teacher_id === filterId
  );

  const getEntry = (day: string, slot: number) => {
    return filteredSchedule.find(e => e.day === day && e.slot_index === slot);
  };

  const handleSlotClick = (day: string, slot: number) => {
    if (selectedUnassigned) {
      // Placing an unassigned lesson
      const targetClass = classes?.find(c => c.id === selectedUnassigned.class_id);
      const teacher = teachers?.find(t => 
        t.qualifications?.some(q => 
          q.subject_id === selectedUnassigned.subject_id && 
          (!targetClass?.level_id || q.level_id === targetClass.level_id)
        )
      );
      if (!teacher) {
        alert("No qualified teacher found for this subject!");
        setSelectedUnassigned(null);
        return;
      }

      const newEntry: ScheduleEntry = {
        day,
        slot_index: slot,
        class_id: selectedUnassigned.class_id,
        subject_id: selectedUnassigned.subject_id,
        teacher_id: teacher.id,
        is_pinned: true, // Auto-pin manually placed lessons
      };

      setLocalSchedule([...localSchedule, newEntry]);
      setSelectedUnassigned(null);
      return;
    }

    if (selectedEntry) {
      if (selectedEntry.day === day && selectedEntry.slot === slot) {
        setSelectedEntry(null);
        return;
      }

      // Move logic
      const entryToMove = localSchedule.find(e =>
        (filterType === 'class' ? e.class_id === filterId : e.teacher_id === filterId) &&
        e.day === selectedEntry.day &&
        e.slot_index === selectedEntry.slot
      );

      if (entryToMove) {
        const newSchedule = localSchedule.map(e => {
          if (e === entryToMove) {
            return { ...e, day, slot_index: slot };
          }
          return e;
        });
        setLocalSchedule(newSchedule);
      }
      setSelectedEntry(null);
    } else {
      const entry = getEntry(day, slot);
      if (entry) {
        setSelectedEntry({ day, slot });
      } else {
        setManualEntry({
          class_id: filterType === 'class' ? filterId : '',
          teacher_id: filterType === 'teacher' ? filterId : '',
          subject_id: '',
          room_id: ''
        });
        setManualAddData({ day, slot });
      }
    }
  };

  const togglePin = (entry: ScheduleEntry) => {
    setLocalSchedule(localSchedule.map(e =>
      (e.day === entry.day && e.slot_index === entry.slot_index && e.class_id === entry.class_id)
        ? { ...e, is_pinned: !e.is_pinned }
        : e
    ));
  };

  const removeEntry = (entry: ScheduleEntry) => {
    setLocalSchedule(localSchedule.filter(e =>
      !(e.day === entry.day && e.slot_index === entry.slot_index && e.class_id === entry.class_id)
    ));
  };

  const checkConflict = (day: string, slot: number) => {
    // Basic conflict highlighting: find if teacher or room is double booked in local schedule
    const entriesInSlot = localSchedule.filter(e => e.day === day && e.slot_index === slot);

    // Teacher double booking
    const teachersInSlot = entriesInSlot.map(e => e.teacher_id);
    const hasTeacherConflict = new Set(teachersInSlot).size !== teachersInSlot.length;

    // Class double booking
    const classesInSlot = entriesInSlot.map(e => e.class_id);
    const hasClassConflict = new Set(classesInSlot).size !== classesInSlot.length;

    // Room double booking
    const roomsInSlot = entriesInSlot.map(e => e.room_id).filter(id => !!id);
    const hasRoomConflict = new Set(roomsInSlot).size !== roomsInSlot.length;

    return hasTeacherConflict || hasClassConflict || hasRoomConflict;
  };

  const getConflictDetails = (day: string, slot: number) => {
    const entriesInSlot = localSchedule.filter(e => e.day === day && e.slot_index === slot);
    const details: string[] = [];

    // Teacher double booking
    const teacherMap: Record<string, ScheduleEntry[]> = {};
    entriesInSlot.forEach(e => {
      if (!teacherMap[e.teacher_id]) teacherMap[e.teacher_id] = [];
      teacherMap[e.teacher_id].push(e);
    });

    Object.entries(teacherMap).forEach(([tId, entries]) => {
      if (entries.length > 1) {
        const teacher = teachers?.find(t => t.id === tId);
        const classesList = entries.map(e => classes?.find(c => c.id === e.class_id)?.name || e.class_id).join(', ');
        details.push(`${teacher?.name || tId} is scheduled for multiple classes: ${classesList}`);
      }
    });

    // Room double booking
    const roomMap: Record<string, ScheduleEntry[]> = {};
    entriesInSlot.forEach(e => {
      if (e.room_id) {
        if (!roomMap[e.room_id]) roomMap[e.room_id] = [];
        roomMap[e.room_id].push(e);
      }
    });

    Object.entries(roomMap).forEach(([rId, entries]) => {
      if (entries.length > 1) {
        const room = rooms?.find(r => r.id === rId);
        const classesList = entries.map(e => classes?.find(c => c.id === e.class_id)?.name || e.class_id).join(', ');
        details.push(`${room?.name || rId} is occupied by multiple classes: ${classesList}`);
      }
    });

    return details;
  };

  const { data: recommendations, isLoading: isLoadingRecs, isError, error } = useQuery({
    queryKey: ['substitution', timetableId, substitutionEntry?.day, substitutionEntry?.slot_index, substitutionEntry?.subject_id, substitutionEntry?.class_id],
    queryFn: () => substitutionService.getRecommendations({
      timetable_id: timetableId!,
      day: substitutionEntry!.day,
      slot: substitutionEntry!.slot_index,
      subject_id: substitutionEntry!.subject_id,
      level_id: classes?.find(c => c.id === substitutionEntry!.class_id)?.level_id
    }),
    enabled: !!timetableId && !!substitutionEntry,
  });

  const handleSubstitute = (teacherId: string) => {
    if (!substitutionEntry) return;
    const newSchedule = localSchedule.map(e => {
      if (e === substitutionEntry) {
        return { ...e, teacher_id: teacherId, is_pinned: true };
      }
      return e;
    });
    setLocalSchedule(newSchedule);
    setSubstitutionEntry(null);
  };

  const handleAddManualEntry = () => {
    if (!manualAddData || !manualEntry.class_id || !manualEntry.subject_id || !manualEntry.teacher_id) return;

    const newEntry: ScheduleEntry = {
      day: manualAddData.day,
      slot_index: manualAddData.slot,
      class_id: manualEntry.class_id,
      subject_id: manualEntry.subject_id,
      teacher_id: manualEntry.teacher_id,
      room_id: manualEntry.room_id || undefined,
      is_pinned: true,
    };

    setLocalSchedule([...localSchedule, newEntry]);
    setManualAddData(null);
  };

  const getManualConflicts = () => {
    if (!manualAddData || !manualEntry.class_id || !manualEntry.subject_id || !manualEntry.teacher_id) return [];

    const conflicts: string[] = [];
    const { day, slot } = manualAddData;

    // Teacher double booking
    const teacherBusy = localSchedule.find(e => e.day === day && e.slot_index === slot && e.teacher_id === manualEntry.teacher_id);
    if (teacherBusy) {
      const cName = classes?.find(c => c.id === teacherBusy.class_id)?.name || teacherBusy.class_id;
      conflicts.push(`Teacher is already teaching class ${cName} at this time.`);
    }

    // Class double booking
    const classBusy = localSchedule.find(e => e.day === day && e.slot_index === slot && e.class_id === manualEntry.class_id);
    if (classBusy) {
      conflicts.push(`Class already has a lesson scheduled at this time.`);
    }

    // Room double booking
    if (manualEntry.room_id) {
      const roomBusy = localSchedule.find(e => e.day === day && e.slot_index === slot && e.room_id === manualEntry.room_id);
      if (roomBusy) {
        const cName = classes?.find(c => c.id === roomBusy.class_id)?.name || roomBusy.class_id;
        conflicts.push(`Room is already occupied by class ${cName} at this time.`);
      }
    }

    // Teacher capacity
    const teacher = teachers?.find(t => t.id === manualEntry.teacher_id);
    if (teacher) {
      const assignedCount = localSchedule.filter(e => e.teacher_id === manualEntry.teacher_id).length;
      if (assignedCount >= teacher.max_slots_per_week) {
        conflicts.push(`Teacher ${teacher.name} is at maximum capacity (${teacher.max_slots_per_week} slots/week).`);
      }

      // Teacher qualification
      if (manualEntry.subject_id && !teacher.qualifications?.some(q => 
        q.subject_id === manualEntry.subject_id && 
        (!selectedClass?.level_id || q.level_id === selectedClass.level_id)
      )) {
        conflicts.push(`Teacher ${teacher.name} is not marked as qualified for this subject at the class level.`);
      }
    }

    // Curriculum check
    if (selectedClass && manualEntry.subject_id) {
      const isInCurriculum = selectedClass.curriculum.some(item => item.subject_id === manualEntry.subject_id);
      if (!isInCurriculum) {
        conflicts.push(`Subject is not in the curriculum for class ${selectedClass.name}.`);
      }
    }

    return conflicts;
  };

  const manualConflicts = getManualConflicts();

  const handleExport = async () => {
    if (localSchedule.length === 0) {
      alert("No schedule data to export");
      return;
    }
    setIsExporting(true);
    // Simulate processing for UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const scheduleToExport = exportScope === 'current'
        ? localSchedule.filter(entry =>
            filterType === 'class' ? entry.class_id === filterId : entry.teacher_id === filterId
          )
        : localSchedule;

      if (exportFormat === 'csv' || exportFormat === 'xls') {
        const headers = ['Day', 'Slot', 'Class', 'Subject', 'Teacher', 'Room'];
        const rows = scheduleToExport.map(e => [
          e.day,
          (e.slot_index + 1).toString(),
          classes?.find(c => c.id === e.class_id)?.name || e.class_id,
          subjects?.find(s => s.id === e.subject_id)?.name || e.subject_id,
          teachers?.find(t => t.id === e.teacher_id)?.name || e.teacher_id,
          rooms?.find(r => r.id === e.room_id)?.name || e.room_id || ''
        ]);

        const separator = exportFormat === 'csv' ? ',' : '\t';
        const content = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(separator)).join('\n');
        const mimeType = exportFormat === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
        const extension = exportFormat === 'csv' ? 'csv' : 'xls';

        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timetable_${exportScope}_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // PDF Export using jsPDF
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const DAYS = days;
        const SLOTS = slots;

        const generateGridForScope = (id: string, name: string, type: 'class' | 'teacher') => {
          const scopeSchedule = localSchedule.filter(e => type === 'class' ? e.class_id === id : e.teacher_id === id);

          doc.setFontSize(18);
          doc.setTextColor(40);
          doc.text(`${type === 'class' ? 'Class' : 'Teacher'}: ${name}`, 14, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

          const tableHeaders = [['Time Slot', ...DAYS]];
          const tableRows = SLOTS.map(slotIdx => {
            const row = [`Slot ${slotIdx + 1}`];
            DAYS.forEach(day => {
              const entry = scopeSchedule.find(e => e.day === day && e.slot_index === slotIdx);
              if (entry) {
                const subject = subjects?.find(s => s.id === entry.subject_id)?.name || entry.subject_id;
                const other = type === 'class'
                  ? (teachers?.find(t => t.id === entry.teacher_id)?.name || entry.teacher_id)
                  : (classes?.find(c => c.id === entry.class_id)?.name || entry.class_id);
                row.push(`${subject}\n(${other})`);
              } else {
                row.push('');
              }
            });
            return row;
          });

          autoTable(doc, {
            head: tableHeaders,
            body: tableRows,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
            headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
          });
        };

        if (exportScope === 'current') {
          const name = filterType === 'class'
            ? classes?.find(c => c.id === filterId)?.name || filterId
            : teachers?.find(t => t.id === filterId)?.name || filterId;
          generateGridForScope(filterId, name, filterType);
        } else {
          const items = filterType === 'class' ? classes : teachers;
          items?.forEach((item, index) => {
            if (index > 0) doc.addPage();
            generateGridForScope(item.id, item.name, filterType);
          });
        }

        doc.save(`timetable_${exportScope}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {unassignedLessons.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-sm border border-white">
          <h3 className="text-xs font-black mb-4 flex items-center text-gray-400 uppercase tracking-widest">
            <PlusCircle size={16} className="mr-2 text-brand-primary" />
            Unassigned (Click to place)
          </h3>
          <div className="flex flex-wrap gap-2">
                {unassignedLessons.map((ul, idx) => {
                  const className = classes?.find(c => c.id === ul.class_id)?.name || ul.class_id;
                  const subject = subjects?.find(s => s.id === ul.subject_id);
                  const subjectName = subject?.name || ul.subject_id;
                  const isSelected = selectedUnassigned?.class_id === ul.class_id && selectedUnassigned?.subject_id === ul.subject_id;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedUnassigned(isSelected ? null : { class_id: ul.class_id, subject_id: ul.subject_id })}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold border transition-all shadow-sm flex items-center space-x-2",
                        isSelected
                          ? 'bg-brand-dark text-white border-brand-dark scale-105'
                          : 'bg-white text-gray-600 border-gray-100 hover:border-brand-primary'
                      )}
                    >
                      {subject?.color && (
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: subject.color }} />
                      )}
                      <span>{className}: {subjectName}</span>
                      <span className="ml-1 opacity-50">x{ul.periods_missing}</span>
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white rounded-full border border-gray-200 p-1 pl-4">
              <Filter size={16} className="text-gray-400 mr-2" />
              <select
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 pr-8"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any);
                  setFilterId('');
                  setSelectedEntry(null);
                  setSelectedUnassigned(null);
                }}
              >
                <option value="class">Class</option>
                <option value="teacher">Teacher</option>
              </select>
              <div className="w-px h-6 bg-gray-200 mx-2"></div>
              <select
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 pr-8"
                value={filterId}
                onChange={(e) => {
                  setFilterId(e.target.value);
                  setSelectedEntry(null);
                  setSelectedUnassigned(null);
                }}
              >
                <option value="">Select...</option>
                {filterType === 'class'
                  ? classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  : teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                }
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {(selectedEntry || selectedUnassigned) && (
              <div className="flex items-center space-x-2 bg-brand-primary/20 px-4 py-2 rounded-full text-brand-dark text-xs font-black animate-pulse border border-brand-primary/30">
                <Search size={14} />
                <span>SELECT TARGET SLOT</span>
              </div>
            )}
            {onRefine && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="bg-white text-gray-600 p-2.5 rounded-full hover:bg-gray-100 transition-all border border-gray-200 shadow-sm"
                  title="Export Timetable"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => onRefine(localSchedule.filter(e => e.is_pinned))}
                  className="bg-brand-dark text-white px-6 py-2.5 rounded-full text-xs font-black hover:brightness-125 transition-all shadow-md flex items-center"
                >
                  <RefreshCw size={14} className="mr-2" />
                  REFINE TIMETABLE
                </button>
              </div>
            )}
          </div>
        </div>

      <div className="overflow-x-auto p-4">
        <Modal
          isOpen={!!substitutionEntry}
          onClose={() => setSubstitutionEntry(null)}
          title="Find Substitute Teacher"
        >
          <div className="space-y-6">
            <div className="bg-brand-secondary/30 p-4 rounded-2xl border border-brand-primary/20">
              <p className="text-sm font-bold text-brand-dark">
                Finding substitute for {classes?.find(c => c.id === substitutionEntry?.class_id)?.name}
              </p>
              <p className="text-xs text-brand-dark/60">
                {subjects?.find(s => s.id === substitutionEntry?.subject_id)?.name} at {substitutionEntry?.day} Slot {substitutionEntry ? substitutionEntry.slot_index + 1 : ''}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Recommended Teachers</h4>
              {isLoadingRecs ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
              ) : isError ? (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                  <AlertTriangle className="mx-auto text-red-400 mb-2" size={24} />
                  <p className="text-xs text-red-600 font-bold">Failed to load recommendations</p>
                  <p className="text-[10px] text-red-500/70 mt-1">{(error as any)?.response?.data || (error as Error).message}</p>
                </div>
              ) : recommendations?.length === 0 ? (
                <p className="text-center py-8 text-gray-400 italic">No qualified free teachers found.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {recommendations?.map((rec: any) => (
                    <button
                      key={rec.teacher_id}
                      onClick={() => handleSubstitute(rec.teacher_id)}
                      className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-brand-primary hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center font-bold text-brand-dark text-xs">
                          {rec.teacher_name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900">{rec.teacher_name}</p>
                          <p className="text-[10px] text-gray-500">{rec.reason}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-primary transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!manualAddData}
          onClose={() => setManualAddData(null)}
          title="Manual Lesson Entry"
        >
          <div className="space-y-6">
            <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
              <p className="text-sm font-bold text-brand-dark">
                Adding lesson for {manualAddData?.day} at Slot {manualAddData ? manualAddData.slot + 1 : ''}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Class</label>
                {filterType === 'class' && filterId ? (
                  <div className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-600">
                    {classes?.find(c => c.id === manualEntry.class_id)?.name || 'Unknown Class'}
                  </div>
                ) : (
                  <select
                    className="w-full bg-gray-50 border-gray-100 rounded-xl text-sm font-bold focus:ring-brand-primary focus:border-brand-primary"
                    value={manualEntry.class_id}
                    onChange={(e) => setManualEntry({ ...manualEntry, class_id: e.target.value, subject_id: '', teacher_id: '' })}
                  >
                    <option value="">Select Class...</option>
                    {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Subject</label>
                <select
                  className="w-full bg-gray-50 border-gray-100 rounded-xl text-sm font-bold focus:ring-brand-primary focus:border-brand-primary"
                  value={manualEntry.subject_id}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setManualEntry(prev => ({ ...prev, subject_id: sid }));
                  }}
                >
                  <option value="">Select Subject...</option>
                  {displaySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Teacher</label>
                <select
                  className="w-full bg-gray-50 border-gray-100 rounded-xl text-sm font-bold focus:ring-brand-primary focus:border-brand-primary"
                  value={manualEntry.teacher_id}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setManualEntry(prev => ({ ...prev, teacher_id: tid }));
                  }}
                >
                  <option value="">Select Teacher...</option>
                  {displayTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Room (Optional)</label>
                <select
                  className="w-full bg-gray-50 border-gray-100 rounded-xl text-sm font-bold focus:ring-brand-primary focus:border-brand-primary"
                  value={manualEntry.room_id}
                  onChange={(e) => setManualEntry({ ...manualEntry, room_id: e.target.value })}
                >
                  <option value="">Select Room...</option>
                  {rooms?.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                </select>
              </div>

              {manualConflicts.length > 0 && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-2">
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Conflicts Detected</span>
                  </div>
                  <ul className="space-y-1">
                    {manualConflicts.map((c, i) => (
                      <li key={i} className="text-[10px] font-bold text-red-800 flex items-start">
                        <span className="w-1 h-1 bg-red-400 rounded-full mr-2 mt-1.5 shrink-0"></span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={handleAddManualEntry}
              disabled={!manualEntry.class_id || !manualEntry.subject_id || !manualEntry.teacher_id}
              className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black hover:brightness-125 transition-all disabled:opacity-50 shadow-lg"
            >
              Add Lesson Entry
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Timetable"
        >
          <div className="space-y-8 p-2">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Select Scope</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportScope('current')}
                  type="button"
                  className={cn(
                    "py-4 rounded-2xl font-bold transition-all border-2",
                    exportScope === 'current'
                      ? "bg-brand-primary/10 border-brand-primary text-brand-dark"
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  Current {filterType === 'class' ? 'Class' : 'Teacher'}
                </button>
                <button
                  onClick={() => setExportScope('all')}
                  type="button"
                  className={cn(
                    "py-4 rounded-2xl font-bold transition-all border-2",
                    exportScope === 'all'
                      ? "bg-brand-primary/10 border-brand-primary text-brand-dark"
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  All {filterType === 'class' ? 'Classes' : 'Teachers'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Select Format</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setExportFormat('pdf')}
                  type="button"
                  className={cn(
                    "py-4 rounded-2xl font-bold transition-all border-2",
                    exportFormat === 'pdf'
                      ? "bg-brand-primary/10 border-brand-primary text-brand-dark"
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  PDF
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  type="button"
                  className={cn(
                    "py-4 rounded-2xl font-bold transition-all border-2",
                    exportFormat === 'csv'
                      ? "bg-brand-primary/10 border-brand-primary text-brand-dark"
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  CSV
                </button>
                <button
                  onClick={() => setExportFormat('xls')}
                  type="button"
                  className={cn(
                    "py-4 rounded-2xl font-bold transition-all border-2",
                    exportFormat === 'xls'
                      ? "bg-brand-primary/10 border-brand-primary text-brand-dark"
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  XLS
                </button>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              type="button"
              className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black hover:brightness-125 transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Download {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </Modal>

        <table className="min-w-full border-separate border-spacing-2">
          <thead>
            <tr>
              <th className="p-2 w-20"></th>
              {days.map(day => (
                <th key={day} className="p-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot}>
                <td className="p-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-300 uppercase">Slot</span>
                    <span className="text-sm font-black text-gray-800">{slot + 1}</span>
                  </div>
                </td>
                {days.map(day => {
                  const entry = getEntry(day, slot);
                  const isSelected = selectedEntry?.day === day && selectedEntry?.slot === slot;
                  const isConflicted = checkConflict(day, slot);
                  const conflictDetails = isConflicted ? getConflictDetails(day, slot) : [];
                  const subject = subjects?.find(s => s.id === entry?.subject_id);
                  const teacher = teachers?.find(t => t.id === entry?.teacher_id);
                  const schoolClass = classes?.find(c => c.id === entry?.class_id);
                  const isStale = entry ? (
                    (entry.class_id && classes && !classes.some(c => c.id === entry.class_id)) ||
                    (entry.teacher_id && teachers && !teachers.some(t => t.id === entry.teacher_id)) ||
                    (entry.subject_id && subjects && !subjects.some(s => s.id === entry.subject_id))
                  ) : false;

                  return (
                    <td
                      key={day}
                      className={cn(
                        "p-1 h-16 w-48 transition-all duration-200",
                        !entry ? 'cursor-pointer' : '',
                        (selectedEntry || selectedUnassigned) && !entry ? 'scale-95 opacity-50 hover:scale-100 hover:opacity-100' : ''
                      )}
                      onClick={() => handleSlotClick(day, slot)}
                    >
                      {entry ? (
                        <div
                          className={cn(
                            "h-full w-full rounded-2xl p-2 flex flex-col justify-between border-2 transition-all group relative cursor-pointer",
                            isSelected ? 'scale-105 shadow-xl z-10 border-brand-primary ring-4 ring-brand-primary/20' : '',
                            isConflicted ? 'bg-red-50 border-red-200 shadow-red-100' :
                            isStale ? 'bg-orange-50 border-orange-300 shadow-orange-100 ring-2 ring-orange-200 ring-inset' :
                            entry.is_pinned ? 'bg-brand-secondary border-brand-primary shadow-brand-secondary' : 'bg-white border-gray-100 hover:border-brand-primary shadow-sm hover:shadow-md'
                          )}
                          style={{
                            borderLeftColor: subject?.color || (isStale ? '#f97316' : isConflicted ? '#ef4444' : '#eee'),
                            borderLeftWidth: '4px'
                          }}
                        >
                          <div className="absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 origin-bottom-right">
                            {timetableId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSubstitutionEntry(entry); }}
                                className="p-2 bg-white rounded-full shadow-lg border border-gray-100 hover:bg-brand-primary transition-colors text-brand-dark"
                                title="Find Substitute"
                              >
                                <UserPlus size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(entry); }}
                              className="p-2 bg-white rounded-full shadow-lg border border-gray-100 hover:bg-brand-primary transition-colors"
                            >
                              {entry.is_pinned ? <Pin size={14} className="text-brand-dark" /> : <PinOff size={14} className="text-gray-400" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeEntry(entry); }}
                              className="p-2 bg-white rounded-full shadow-lg border border-gray-100 hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>

                          <div className="space-y-0.5">
                            <div className={cn(
                              "text-xs font-black tracking-tight leading-tight uppercase",
                              isConflicted ? 'text-red-700' : isStale ? 'text-orange-700' : 'text-gray-600'
                            )}>
                              <span className="truncate">{subject?.name || 'Deleted Subject'}</span>
                            </div>
                            <div className={cn(
                              "text-[10px] font-bold flex items-center",
                              isConflicted ? 'text-red-500' : isStale ? 'text-orange-500' : 'text-gray-400'
                            )}>
                              <span className="truncate" style={{ color: teacher?.color }}>
                                {filterType === 'class' ? (teacher?.name || 'Deleted Teacher') : (schoolClass?.name || 'Deleted Class')}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-end mt-1">
                            {isConflicted && (
                              <div
                                className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center cursor-help group/conflict"
                                title={conflictDetails.join('\n')}
                              >
                                <Info size={8} className="mr-1" /> Conflict
                                <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-brand-dark text-white text-[10px] font-bold rounded-xl opacity-0 group-hover/conflict:opacity-100 pointer-events-none transition-opacity shadow-xl z-20">
                                  {conflictDetails.map((d, i) => <p key={i}>{d}</p>)}
                                </div>
                              </div>
                            )}
                            {isStale && !isConflicted && (
                              <div className="text-[8px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center">
                                <AlertTriangle size={8} className="mr-1" /> Stale
                              </div>
                            )}
                            {entry.is_pinned && !isConflicted && !isStale && (
                              <div className="text-[8px] font-black bg-brand-primary text-brand-dark px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center">
                                <Pin size={8} className="mr-1" /> Pinned
                              </div>
                            )}
                            {!entry.is_pinned && !isConflicted && (
                              <div className="w-3 h-3"></div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "h-full w-full rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center transition-all group",
                          (selectedEntry || selectedUnassigned) ? 'border-brand-primary/40 bg-brand-primary/5' : 'hover:border-brand-primary/40 hover:bg-gray-50'
                        )}>
                          {(selectedEntry || selectedUnassigned) ? (
                            <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-brand-dark shadow-sm animate-bounce">
                              <ChevronRight size={12} />
                            </div>
                          ) : (
                            <div className="opacity-0 group-hover:opacity-100 transition-all text-gray-300">
                              <PlusCircle size={20} />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};

export default TimetableGrid;
