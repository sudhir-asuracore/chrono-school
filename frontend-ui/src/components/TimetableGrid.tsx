import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classService, teacherService, subjectService } from '../services/api';
import { ScheduleEntry } from '../types';
import { Filter, Pin, PinOff, PlusCircle, XCircle, Search, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';

interface TimetableGridProps {
  schedule: ScheduleEntry[];
  unassignedLessons?: { class_id: string; subject_id: string; periods_missing: number }[];
  onRefine?: (pinned: ScheduleEntry[]) => void;
  localSchedule: ScheduleEntry[];
  setLocalSchedule: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ 
  schedule, 
  unassignedLessons = [], 
  onRefine,
  localSchedule,
  setLocalSchedule
}) => {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });

  const [filterType, setFilterType] = useState<'class' | 'teacher'>('class');
  const [filterId, setFilterId] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<{ day: string, slot: number } | null>(null);
  const [selectedUnassigned, setSelectedUnassigned] = useState<{ class_id: string; subject_id: string } | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const slots = Array.from({ length: 8 }, (_, i) => i);

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
      const teacher = teachers?.find(t => t.qualified_subjects.includes(selectedUnassigned.subject_id));
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

    return hasTeacherConflict || hasClassConflict;
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
              <button
                onClick={() => onRefine(localSchedule.filter(e => e.is_pinned))}
                className="bg-brand-dark text-white px-6 py-2.5 rounded-full text-xs font-black hover:brightness-125 transition-all shadow-md flex items-center"
              >
                <RefreshCw size={14} className="mr-2" />
                REFINE TIMETABLE
              </button>
            )}
          </div>
        </div>

      <div className="overflow-x-auto p-4">
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
                  const subject = subjects?.find(s => s.id === entry?.subject_id);
                  const teacher = teachers?.find(t => t.id === entry?.teacher_id);
                  const schoolClass = classes?.find(c => c.id === entry?.class_id);

                  return (
                    <td 
                      key={day} 
                      className={cn(
                        "p-1 h-32 w-48 transition-all duration-200",
                        (selectedEntry || selectedUnassigned) && !entry ? 'cursor-pointer scale-95 opacity-50 hover:scale-100 hover:opacity-100' : ''
                      )}
                      onClick={() => handleSlotClick(day, slot)}
                    >
                      {entry ? (
                        <div className={cn(
                          "h-full w-full rounded-3xl p-4 flex flex-col justify-between border-2 transition-all group relative cursor-pointer",
                          isSelected ? 'scale-105 shadow-xl z-10 border-brand-primary ring-4 ring-brand-primary/20' : '',
                          isConflicted ? 'bg-red-50 border-red-200 shadow-red-100' : 
                          entry.is_pinned ? 'bg-brand-secondary border-brand-primary shadow-brand-secondary' : 'bg-white border-gray-100 hover:border-brand-primary shadow-sm hover:shadow-md'
                        )}>
                          <div className="absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 origin-bottom-right">
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
                          
                          <div className="space-y-1">
                            <div className={cn(
                              "text-xs font-black tracking-tight leading-tight uppercase flex items-center",
                              isConflicted ? 'text-red-700' : 'text-gray-900'
                            )}>
                              {subject?.color && (
                                <span 
                                  className="w-3 h-3 rounded-full mr-1.5 shrink-0 shadow-sm" 
                                  style={{ backgroundColor: subject.color }}
                                />
                              )}
                              <span className="truncate">{subject?.name}</span>
                            </div>
                            <div className={cn(
                              "text-[10px] font-bold flex items-center",
                              isConflicted ? 'text-red-500' : 'text-gray-400'
                            )}>
                              {filterType === 'class' && teacher?.color && (
                                <span 
                                  className="w-3 h-3 rounded-full mr-1 shrink-0" 
                                  style={{ backgroundColor: teacher.color }}
                                />
                              )}
                              <span className="truncate">{filterType === 'class' ? teacher?.name : schoolClass?.name}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-end mt-2">
                            {isConflicted && (
                              <div className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Conflict</div>
                            )}
                            {entry.is_pinned && !isConflicted && (
                              <div className="text-[8px] font-black bg-brand-primary text-brand-dark px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center">
                                <Pin size={8} className="mr-1" /> Pinned
                              </div>
                            )}
                            {!entry.is_pinned && !isConflicted && (
                              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "h-full w-full rounded-3xl border-2 border-dashed border-gray-100 flex items-center justify-center transition-all",
                          (selectedEntry || selectedUnassigned) ? 'border-brand-primary/40 bg-brand-primary/5' : ''
                        )}>
                          {(selectedEntry || selectedUnassigned) && (
                            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-brand-dark shadow-sm">
                              <ChevronRight size={16} />
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
