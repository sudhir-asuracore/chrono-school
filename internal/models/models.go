package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Organization struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type Subject struct {
	ID                   uuid.UUID `db:"id" json:"id"`
	OrganizationID       uuid.UUID `db:"organization_id" json:"organization_id"`
	Name                 string    `db:"name" json:"name"`
	RequiresDoublePeriod bool      `db:"requires_double_period" json:"requires_double_period"`
	RequiredRoomType     *string   `db:"required_room_type" json:"required_room_type"`
	Color                *string   `db:"color" json:"color"`
	CreatedAt            time.Time `db:"created_at" json:"created_at"`
}

type Teacher struct {
	ID                 uuid.UUID              `db:"id" json:"id"`
	OrganizationID     uuid.UUID              `db:"organization_id" json:"organization_id"`
	Name               string                 `db:"name" json:"name"`
	MaxSlotsPerWeek    int                    `db:"max_slots_per_week" json:"max_slots_per_week"`
	AvailabilityMatrix *json.RawMessage       `db:"availability_matrix" json:"availability_matrix"`
	Color              *string                `db:"color" json:"color"`
	CreatedAt          time.Time              `db:"created_at" json:"created_at"`
	Qualifications     []TeacherQualification `json:"qualifications,omitempty"`
	IsStale            bool                   `db:"is_stale" json:"is_stale"`
}

type TeacherQualification struct {
	TeacherID uuid.UUID `db:"teacher_id" json:"-"`
	SubjectID uuid.UUID `db:"subject_id" json:"subject_id"`
	LevelID   uuid.UUID `db:"level_id" json:"level_id"`
}

type Class struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	OrganizationID uuid.UUID        `db:"organization_id" json:"organization_id"`
	Name           string           `db:"name" json:"name"`
	Type           string           `db:"type" json:"type"`
	LevelID        *uuid.UUID       `db:"level_id" json:"level_id"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	Curriculum     []CurriculumItem `json:"curriculum,omitempty"`
}

type EducationalLevel struct {
	ID             uuid.UUID `db:"id" json:"id"`
	OrganizationID uuid.UUID `db:"organization_id" json:"organization_id"`
	Name           string    `db:"name" json:"name"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

type CurriculumItem struct {
	ClassID        uuid.UUID `db:"class_id" json:"class_id"`
	SubjectID      uuid.UUID `db:"subject_id" json:"subject_id"`
	PeriodsPerWeek int       `db:"periods_per_week" json:"periods_per_week"`
	BindingID      *string   `db:"binding_id" json:"binding_id"`
}

type Room struct {
	ID             uuid.UUID `db:"id" json:"id"`
	OrganizationID uuid.UUID `db:"organization_id" json:"organization_id"`
	Name           string    `db:"name" json:"name"`
	Type           string    `db:"type" json:"type"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

type TimetableJob struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	OrganizationID uuid.UUID        `db:"organization_id" json:"organization_id"`
	Status         string           `db:"status" json:"status"`
	Payload        json.RawMessage  `db:"payload" json:"payload"`
	Result         *json.RawMessage `db:"result" json:"result"`
	ErrorMessage   *string          `db:"error_message" json:"error_message"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time        `db:"updated_at" json:"updated_at"`
}

type SavedTimetable struct {
	ID             uuid.UUID       `db:"id" json:"id"`
	OrganizationID uuid.UUID       `db:"organization_id" json:"organization_id"`
	Name           string          `db:"name" json:"name"`
	Data           json.RawMessage `db:"data" json:"data"`
	InputSnapshot  json.RawMessage `db:"input_snapshot" json:"input_snapshot"`
	CreatedAt      time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time       `db:"updated_at" json:"updated_at"`
	IsStale        bool            `db:"is_stale" json:"is_stale"`
}
