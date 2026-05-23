export interface Subject {
  id: string;
  organization_id: string;
  name: string;
  requires_double_period: boolean;
  required_room_type?: string;
  color?: string;
  created_at: string;
}

export interface TeacherQualification {
  subject_id: string;
  level_id: string;
}

export interface Teacher {
  id: string;
  organization_id: string;
  name: string;
  max_slots_per_week: number;
  qualifications: TeacherQualification[];
  availability_matrix?: boolean[][];
  color?: string;
  created_at: string;
  is_stale: boolean;
}

export interface CurriculumItem {
  subject_id: string;
  periods_per_week: number;
  binding_id?: string;
}

export interface Class {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  level_id?: string;
  curriculum: CurriculumItem[];
  created_at: string;
}

export interface EducationalLevel {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface Room {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  created_at: string;
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TimetableJob {
  id: string;
  organization_id: string;
  status: JobStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  day: string;
  slot_index: number;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  room_id?: string;
  is_pinned?: boolean;
}

export interface SolveResponse {
  status: string;
  solve_time_ms: number;
  schedule: ScheduleEntry[];
  unassigned_lessons: { class_id: string; subject_id: string; periods_missing: number }[];
  validation_errors?: string[];
}

export interface SavedTimetable {
  id: string;
  organization_id: string;
  name: string;
  data: ScheduleEntry[];
  input_snapshot: any;
  created_at: string;
  updated_at: string;
  is_stale: boolean;
}
