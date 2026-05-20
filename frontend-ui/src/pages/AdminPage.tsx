import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, AlertCircle, CheckCircle2, Trash2, ShieldAlert } from 'lucide-react';
import { subjectService, teacherService, classService, adminService } from '../services/api';
import { cn } from '../utils/cn';

const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const [clearOptions, setClearOptions] = useState({
    teachers: false,
    subjects: false,
    classes: false,
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });

  const handleExport = () => {
    const data = {
      subjects: subjects || [],
      teachers: teachers || [],
      classes: classes || [],
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

        if (!data.subjects || !data.teachers || !data.classes) {
          throw new Error('Invalid file format. Must contain subjects, teachers, and classes.');
        }

        // Import sequence to respect dependencies
        let successCount = 0;
        let failCount = 0;

        // 1. Subjects
        for (const s of data.subjects) {
          try {
            await subjectService.create(s);
            successCount++;
          } catch (err) {
            console.error('Failed to import subject', s, err);
            failCount++;
          }
        }
        // 2. Teachers
        for (const t of data.teachers) {
          try {
            await teacherService.create(t);
            successCount++;
          } catch (err) {
            console.error('Failed to import teacher', t, err);
            failCount++;
          }
        }
        // 3. Classes
        for (const c of data.classes) {
          try {
            await classService.create(c);
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
    if (!clearOptions.teachers && !clearOptions.subjects && !clearOptions.classes) {
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
      setClearOptions({ teachers: false, subjects: false, classes: false });
    } catch (err: any) {
      setImportStatus({ type: 'error', message: err.response?.data?.error || 'Failed to clear data.' });
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Administration</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-indigo-600">
            <Download size={24} />
            <h3 className="text-xl font-semibold">Export Data</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Download all school data (teachers, subjects, and classes) as a JSON file for backup or transfer.
          </p>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download size={18} />
            <span>Download JSON</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-indigo-600">
            <Upload size={24} />
            <h3 className="text-xl font-semibold">Import Data</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Upload a previously exported JSON file to restore or add data. Note: Existing records with the same IDs will be skipped.
          </p>
          <label className={cn(
            "w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors cursor-pointer border-2 border-dashed",
            isImporting ? "bg-gray-50 border-gray-300 cursor-not-allowed" : "border-indigo-300 hover:border-indigo-500 bg-indigo-50"
          )}>
            <Upload size={18} className="text-indigo-600" />
            <span className="text-indigo-600 font-medium">{isImporting ? 'Importing...' : 'Select JSON File'}</span>
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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
        <div className="flex items-center space-x-3 mb-4 text-red-600">
          <Trash2 size={24} />
          <h3 className="text-xl font-semibold">Clear Data</h3>
        </div>
        <p className="text-gray-600 mb-6">
          Permanently delete selected data from the system. This action cannot be undone.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={clearOptions.teachers}
              onChange={(e) => setClearOptions({...clearOptions, teachers: e.target.checked})}
              className="rounded text-red-600 focus:ring-red-500" 
            />
            <span className="font-medium text-gray-700">Teachers</span>
          </label>
          <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={clearOptions.subjects}
              onChange={(e) => setClearOptions({...clearOptions, subjects: e.target.checked})}
              className="rounded text-red-600 focus:ring-red-500" 
            />
            <span className="font-medium text-gray-700">Subjects</span>
          </label>
          <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={clearOptions.classes}
              onChange={(e) => setClearOptions({...clearOptions, classes: e.target.checked})}
              className="rounded text-red-600 focus:ring-red-500" 
            />
            <span className="font-medium text-gray-700">Classes</span>
          </label>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!clearOptions.teachers && !clearOptions.subjects && !clearOptions.classes}
          className="flex items-center justify-center space-x-2 bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={18} />
          <span>Clear Selected Data</span>
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <ShieldAlert size={32} />
              <h3 className="text-xl font-bold">Are you absolutely sure?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete the selected records. This action is irreversible.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold flex items-center justify-center"
              >
                {isClearing ? 'Clearing...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {importStatus && (
        <div className={cn(
          "p-4 rounded-lg flex items-start space-x-3",
          importStatus.type === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {importStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <div>
            <p className="font-bold">{importStatus.type === 'success' ? 'Success' : 'Operation Report'}</p>
            <p>{importStatus.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
