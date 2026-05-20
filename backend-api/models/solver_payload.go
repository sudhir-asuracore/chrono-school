package models

type SolverSettings struct {
	TimeslotsPerDay  int      `json:"timeslots_per_day"`
	Days             []string `json:"days"`
	MaxSearchSeconds int      `json:"max_search_seconds"`
}

type SolverFixedBreak struct {
	Day       string `json:"day"`
	SlotIndex int    `json:"slot_index"`
	Label     string `json:"label"`
}

type SolverTeacher struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	MaxSlotsPerWeek   int      `json:"max_slots_per_week"`
	QualifiedSubjects []string `json:"qualified_subjects"`
}

type SolverSubject struct {
	ID                   string `json:"id"`
	Name                 string `json:"name"`
	RequiresDoublePeriod bool   `json:"requires_double_period"`
}

type SolverCurriculumItem struct {
	SubjectID      string `json:"subject_id"`
	PeriodsPerWeek int    `json:"periods_per_week"`
}

type SolverClass struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Type       string                 `json:"type"`
	Curriculum []SolverCurriculumItem `json:"curriculum"`
}

type SolverScheduleEntry struct {
	Day       string `json:"day"`
	SlotIndex int    `json:"slot_index"`
	ClassID   string `json:"class_id"`
	SubjectID string `json:"subject_id"`
	TeacherID string `json:"teacher_id"`
}

type SolverSolveRequest struct {
	Settings    SolverSettings        `json:"settings"`
	FixedBreaks []SolverFixedBreak    `json:"fixed_breaks"`
	Teachers    []SolverTeacher       `json:"teachers"`
	Subjects    []SolverSubject       `json:"subjects"`
	Classes     []SolverClass         `json:"classes"`
	PreAssigned []SolverScheduleEntry `json:"pre_assigned"`
}
