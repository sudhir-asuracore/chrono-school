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

class Teacher(BaseModel):
    id: str
    name: str
    max_slots_per_week: int
    qualified_subjects: List[str]

class Subject(BaseModel):
    id: str
    name: str
    requires_double_period: bool = False

class CurriculumItem(BaseModel):
    subject_id: str
    periods_per_week: int

class SchoolClass(BaseModel):
    id: str
    name: str
    type: str
    curriculum: List[CurriculumItem]

class ScheduleEntry(BaseModel):
    day: str
    slot_index: int
    class_id: str
    subject_id: str
    teacher_id: str

class SolveRequest(BaseModel):
    settings: Setting
    fixed_breaks: List[FixedBreak] = []
    teachers: List[Teacher]
    subjects: List[Subject]
    classes: List[SchoolClass]
    pre_assigned: List[ScheduleEntry] = []

    @field_validator('fixed_breaks', 'pre_assigned', mode='before')
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
