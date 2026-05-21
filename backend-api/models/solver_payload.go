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

type SolverTeacherQualification struct {
	SubjectID string `json:"subject_id"`
	LevelID   string `json:"level_id"`
}

type SolverTeacher struct {
	ID                 string                       `json:"id"`
	Name               string                       `json:"name"`
	MaxSlotsPerWeek    int                          `json:"max_slots_per_week"`
	Qualifications     []SolverTeacherQualification `json:"qualifications"`
	AvailabilityMatrix [][]bool                     `json:"availability_matrix"`
}

type SolverSubject struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	RequiresDoublePeriod bool    `json:"requires_double_period"`
	RequiredRoomType     *string `json:"required_room_type"`
}

type SolverCurriculumItem struct {
	SubjectID      string  `json:"subject_id"`
	PeriodsPerWeek int     `json:"periods_per_week"`
	BindingID      *string `json:"binding_id"`
}

type SolverClass struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Type       string                 `json:"type"`
	LevelID    string                 `json:"level_id"`
	Curriculum []SolverCurriculumItem `json:"curriculum"`
}

type SolverEducationalLevel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SolverRoom struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type SolverScheduleEntry struct {
	Day       string  `json:"day"`
	SlotIndex int     `json:"slot_index"`
	ClassID   string  `json:"class_id"`
	SubjectID string  `json:"subject_id"`
	TeacherID string  `json:"teacher_id"`
	RoomID    *string `json:"room_id"`
}

type SolverHoliday struct {
	Day string `json:"day"`
}

type SolverTeacherVacation struct {
	TeacherID string `json:"teacher_id"`
	Day       string `json:"day"`
}

type SolverSolveRequest struct {
	Settings         SolverSettings           `json:"settings"`
	FixedBreaks      []SolverFixedBreak       `json:"fixed_breaks"`
	Holidays         []SolverHoliday          `json:"holidays"`
	TeacherVacations []SolverTeacherVacation  `json:"teacher_vacations"`
	Teachers         []SolverTeacher          `json:"teachers"`
	Subjects         []SolverSubject          `json:"subjects"`
	Rooms            []SolverRoom             `json:"rooms"`
	Classes          []SolverClass            `json:"classes"`
	Levels           []SolverEducationalLevel `json:"levels"`
	PreAssigned      []SolverScheduleEntry    `json:"pre_assigned"`
}
