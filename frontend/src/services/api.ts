import axios from 'axios';
import { Subject, Teacher, Class, TimetableJob, SolveResponse, SavedTimetable, Room, EducationalLevel } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const subjectService = {
  getAll: () => apiClient.get<Subject[]>('/subjects').then(res => res.data),
  create: (data: Partial<Subject>) => apiClient.post<Subject>('/subjects', data).then(res => res.data),
  update: (id: string, data: Partial<Subject>) => apiClient.put<Subject>(`/subjects/${id}`, data).then(res => res.data),
  delete: (id: string) => apiClient.delete(`/subjects/${id}`),
};

export const teacherService = {
  getAll: () => apiClient.get<Teacher[]>('/teachers').then(res => res.data),
  create: (data: Partial<Teacher>) => apiClient.post<Teacher>('/teachers', data).then(res => res.data),
  update: (id: string, data: Partial<Teacher>) => apiClient.put<Teacher>(`/teachers/${id}`, data).then(res => res.data),
  delete: (id: string) => apiClient.delete(`/teachers/${id}`),
};

export const classService = {
  getAll: () => apiClient.get<Class[]>('/classes').then(res => res.data),
  create: (data: Partial<Class>) => apiClient.post<Class>('/classes', data).then(res => res.data),
  update: (id: string, data: Partial<Class>) => apiClient.put<Class>(`/classes/${id}`, data).then(res => res.data),
  delete: (id: string) => apiClient.delete(`/classes/${id}`),
};

export const roomService = {
  getAll: () => apiClient.get<Room[]>('/rooms').then(res => res.data),
  create: (data: Partial<Room>) => apiClient.post<Room>('/rooms', data).then(res => res.data),
  update: (id: string, data: Partial<Room>) => apiClient.put<Room>(`/rooms/${id}`, data).then(res => res.data),
  delete: (id: string) => apiClient.delete(`/rooms/${id}`),
};

export const levelService = {
  getAll: () => apiClient.get<EducationalLevel[]>('/levels').then(res => res.data),
  create: (data: Partial<EducationalLevel>) => apiClient.post<EducationalLevel>('/levels', data).then(res => res.data),
  update: (id: string, data: Partial<EducationalLevel>) => apiClient.put<EducationalLevel>(`/levels/${id}`, data).then(res => res.data),
  delete: (id: string) => apiClient.delete(`/levels/${id}`),
};

export const jobService = {
  create: (snapshot?: any) => apiClient.post<TimetableJob>('/jobs', snapshot).then(res => res.data),
  getStatus: (id: string) => apiClient.get<TimetableJob>(`/jobs/${id}`).then(res => res.data),
  getResult: (id: string) => apiClient.get<SolveResponse>(`/jobs/${id}/result`).then(res => res.data),
};

export const adminService = {
  clearData: (options: { teachers: boolean, subjects: boolean, classes: boolean, rooms: boolean, levels: boolean, timetables: boolean }) =>
    apiClient.post('/admin/clear', options).then(res => res.data),
};

export const savedTimetableService = {
  getAll: () => apiClient.get<SavedTimetable[]>('/timetables').then(res => res.data),
  create: (data: Partial<SavedTimetable>) => apiClient.post<SavedTimetable>('/timetables', data).then(res => res.data),
  getById: (id: string) => apiClient.get<SavedTimetable>(`/timetables/${id}`).then(res => res.data),
  update: (id: string, data: Partial<SavedTimetable>) => apiClient.put<SavedTimetable>(`/timetables/${id}`, data).then(res => res.data),
  delete: (id: string) => apiClient.delete(`/timetables/${id}`),
};

export const substitutionService = {
  getRecommendations: (params: { timetable_id: string, day: string, slot: number, subject_id: string, level_id?: string }) =>
    apiClient.get<any[]>('/substitution/recommendations', { params }).then(res => res.data),
};
