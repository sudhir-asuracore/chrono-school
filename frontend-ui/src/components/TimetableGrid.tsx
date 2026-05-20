import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classService, teacherService, subjectService } from '../services/api';
import { ScheduleEntry } from '../types';
import { Filter, Pin, PinOff, PlusCircle, XCircle } from 'lucide-react';

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
    <div className="space-y-4">
      {unassignedLessons.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold mb-3 flex items-center text-gray-700">
            <PlusCircle size={16} className="mr-2 text-indigo-500" />
            Unassigned Lessons (Click to place)
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassignedLessons.map((ul, idx) => {
              const className = classes?.find(c => c.id === ul.class_id)?.name || ul.class_id;
              const subjectName = subjects?.find(s => s.id === ul.subject_id)?.name || ul.subject_id;
              const isSelected = selectedUnassigned?.class_id === ul.class_id && selectedUnassigned?.subject_id === ul.subject_id;
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedUnassigned(isSelected ? null : { class_id: ul.class_id, subject_id: ul.subject_id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md transform scale-105' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                  }`}
                >
                  {className}: {subjectName} ({ul.periods_missing})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter size={20} className="text-gray-400" />
            <select 
              className="rounded-md border-gray-300 text-sm"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setFilterId('');
                setSelectedEntry(null);
                setSelectedUnassigned(null);
              }}
            >
              <option value="class">View by Class</option>
              <option value="teacher">View by Teacher</option>
            </select>
            <select 
              className="rounded-md border-gray-300 text-sm"
              value={filterId}
              onChange={(e) => {
                setFilterId(e.target.value);
                setSelectedEntry(null);
                setSelectedUnassigned(null);
              }}
            >
              <option value="">Select {filterType}...</option>
              {filterType === 'class' 
                ? classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                : teachers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
              }
            </select>
          </div>
          <div className="flex items-center space-x-4">
            {selectedEntry && (
              <div className="text-sm font-medium text-indigo-600 animate-pulse">
                Moving entry... Click target slot
              </div>
            )}
            {selectedUnassigned && (
              <div className="text-sm font-medium text-indigo-600 animate-pulse">
                Placing lesson... Click target slot
              </div>
            )}
            {onRefine && (
              <button
                onClick={() => onRefine(localSchedule.filter(e => e.is_pinned))}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
              >
                <Pin size={16} className="mr-2" />
                Refine with Pinned
              </button>
            )}
          </div>
        </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 border border-gray-100 bg-gray-50 w-20"></th>
              {days.map(day => (
                <th key={day} className="p-3 border border-gray-100 bg-gray-50 font-bold text-gray-700">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot}>
                <td className="p-3 border border-gray-100 bg-gray-50 text-center text-xs font-bold text-gray-400">
                  Slot {slot + 1}
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
                      className={`p-2 border border-gray-100 h-24 w-40 vertical-top cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-100' : isConflicted ? 'bg-red-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSlotClick(day, slot)}
                    >
                      {entry ? (
                        <div className={`h-full w-full rounded-lg p-2 flex flex-col justify-between border group relative ${
                          isConflicted ? 'bg-red-100 border-red-200' : entry.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-100'
                        }`}>
                          <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); togglePin(entry); }}
                              className="p-1 bg-white rounded shadow-sm hover:text-indigo-600"
                            >
                              {entry.is_pinned ? <Pin size={10} className="text-amber-600" /> : <PinOff size={10} />}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeEntry(entry); }}
                              className="p-1 bg-white rounded shadow-sm hover:text-red-600"
                            >
                              <XCircle size={10} />
                            </button>
                          </div>
                          <div>
                            <p className={`text-xs font-bold truncate ${isConflicted ? 'text-red-700' : 'text-indigo-700'}`}>
                              {subject?.name}
                            </p>
                            <p className={`text-[10px] truncate ${isConflicted ? 'text-red-500' : 'text-indigo-500'}`}>
                              {filterType === 'class' ? teacher?.name : schoolClass?.name}
                            </p>
                          </div>
                          <div className="flex justify-between items-end">
                            {isConflicted && (
                              <div className="text-[8px] font-bold text-red-600 uppercase">Conflict</div>
                            )}
                            {entry.is_pinned && (
                              <div className="text-[8px] font-bold text-amber-600 uppercase flex items-center">
                                <Pin size={8} className="mr-0.5" /> Pinned
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full rounded-lg border border-dashed border-gray-100"></div>
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
