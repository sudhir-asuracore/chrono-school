import React from 'react';
import { cn } from '../utils/cn';

interface AvailabilityMatrixProps {
  value: boolean[][];
  onChange: (value: boolean[][]) => void;
  days?: string[];
  timeslots?: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = 8;

const AvailabilityMatrix: React.FC<AvailabilityMatrixProps> = ({ 
  value, 
  onChange, 
  days = DAYS, 
  timeslots = SLOTS 
}) => {
  // Initialize matrix if empty or wrong size
  const matrix = React.useMemo(() => {
    let m = value || [];
    if (m.length !== days.length) {
      m = Array(days.length).fill(null).map(() => Array(timeslots).fill(true));
    }
    return m;
  }, [value, days.length, timeslots]);

  const toggleSlot = (dayIdx: number, slotIdx: number) => {
    const newMatrix = matrix.map((day, dIdx) => 
      dIdx === dayIdx 
        ? day.map((slot, sIdx) => sIdx === slotIdx ? !slot : slot)
        : [...day]
    );
    onChange(newMatrix);
  };

  const toggleDay = (dayIdx: number) => {
    const allEnabled = matrix[dayIdx].every(s => s);
    const newMatrix = matrix.map((day, dIdx) => 
      dIdx === dayIdx 
        ? Array(timeslots).fill(!allEnabled)
        : [...day]
    );
    onChange(newMatrix);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2"></th>
            {Array.from({ length: timeslots }).map((_, i) => (
              <th key={i} className="p-2 text-xs font-bold text-gray-400 uppercase">
                Slot {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dIdx) => (
            <tr key={day}>
              <td 
                className="p-2 text-sm font-bold text-gray-700 cursor-pointer hover:text-brand-primary"
                onClick={() => toggleDay(dIdx)}
              >
                {day}
              </td>
              {matrix[dIdx]?.map((available, sIdx) => (
                <td key={sIdx} className="p-1">
                  <button
                    type="button"
                    onClick={() => toggleSlot(dIdx, sIdx)}
                    className={cn(
                      "w-full h-8 rounded-md transition-all border",
                      available 
                        ? "bg-green-100 border-green-200 text-green-700 hover:bg-green-200" 
                        : "bg-red-50 border-red-100 text-red-400 hover:bg-red-100"
                    )}
                  >
                    {available ? '✓' : '×'}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-400 italic">
        Click on a day name to toggle the entire day. Green means available.
      </p>
    </div>
  );
};

export default AvailabilityMatrix;
