from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class Setting(BaseModel):
    timeslots_per_day: int
    days: List[str]
    max_search_seconds: int = 60

class FixedBreak(BaseModel):
    day: str  # e.g., "Mon", "Tue" or "All"
    slot_index: int
    label: str

class TeacherQualification(BaseModel):
    subject_id: str
    level_id: str

class Teacher(BaseModel):
    id: str
    name: str
    max_slots_per_week: int
    qualifications: List[TeacherQualification] = []
    availability_matrix: Optional[List[List[bool]]] = None # [day_index][slot_index]

class Subject(BaseModel):
    id: str
    name: str
    requires_double_period: bool = False
    required_room_type: Optional[str] = None

class CurriculumItem(BaseModel):
    subject_id: str
    periods_per_week: int
    binding_id: Optional[str] = None

class SchoolClass(BaseModel):
    id: str
    name: str
    type: str
    level_id: str
    curriculum: List[CurriculumItem]

class EducationalLevel(BaseModel):
    id: str
    name: str

class Room(BaseModel):
    id: str
    name: str
    type: str

class ScheduleEntry(BaseModel):
    day: str
    slot_index: int
    class_id: str
    subject_id: str
    teacher_id: str
    room_id: Optional[str] = None

class Holiday(BaseModel):
    day: str

class TeacherVacation(BaseModel):
    teacher_id: str
    day: str

class SolveRequest(BaseModel):
    settings: Setting
    fixed_breaks: List[FixedBreak] = []
    holidays: List[Holiday] = []
    teacher_vacations: List[TeacherVacation] = []
    teachers: List[Teacher]
    subjects: List[Subject]
    rooms: List[Room] = []
    classes: List[SchoolClass]
    levels: List[EducationalLevel] = []
    pre_assigned: List[ScheduleEntry] = []

    @field_validator('fixed_breaks', 'pre_assigned', 'holidays', 'teacher_vacations', mode='before')
    @classmethod
    def allow_none_for_lists(cls, v):
        if v is None:
            return []
        return v

class UnassignedLesson(BaseModel):
    class_id: str
    subject_id: str
    periods_missing: int

class SolveResponse(BaseModel):
    status: str # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    solve_time_ms: float
    schedule: List[ScheduleEntry]
    unassigned_lessons: List[UnassignedLesson]
    validation_errors: List[str] = []
