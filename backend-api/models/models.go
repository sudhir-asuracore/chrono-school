package models

import (
	"encoding/json"
	"github.com/google/uuid"
	"time"
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
	CreatedAt            time.Time `db:"created_at" json:"created_at"`
}

type Teacher struct {
	ID                uuid.UUID   `db:"id" json:"id"`
	OrganizationID    uuid.UUID   `db:"organization_id" json:"organization_id"`
	Name              string      `db:"name" json:"name"`
	MaxSlotsPerWeek   int         `db:"max_slots_per_week" json:"max_slots_per_week"`
	CreatedAt         time.Time   `db:"created_at" json:"created_at"`
	QualifiedSubjects []uuid.UUID `json:"qualified_subjects,omitempty"`
}

type Class struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	OrganizationID uuid.UUID        `db:"organization_id" json:"organization_id"`
	Name           string           `db:"name" json:"name"`
	Type           string           `db:"type" json:"type"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	Curriculum     []CurriculumItem `json:"curriculum,omitempty"`
}

type CurriculumItem struct {
	ClassID        uuid.UUID `db:"class_id" json:"class_id"`
	SubjectID      uuid.UUID `db:"subject_id" json:"subject_id"`
	PeriodsPerWeek int       `db:"periods_per_week" json:"periods_per_week"`
}

type TimetableJob struct {
	ID             uuid.UUID       `db:"id" json:"id"`
	OrganizationID uuid.UUID       `db:"organization_id" json:"organization_id"`
	Status         string          `db:"status" json:"status"`
	Payload        json.RawMessage `db:"payload" json:"payload"`
	Result         json.RawMessage `db:"result" json:"result"`
	ErrorMessage   *string         `db:"error_message" json:"error_message"`
	CreatedAt      time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time       `db:"updated_at" json:"updated_at"`
}

type SavedTimetable struct {
	ID             uuid.UUID       `db:"id" json:"id"`
	OrganizationID uuid.UUID       `db:"organization_id" json:"organization_id"`
	Name           string          `db:"name" json:"name"`
	Data           json.RawMessage `db:"data" json:"data"`
	InputSnapshot  json.RawMessage `db:"input_snapshot" json:"input_snapshot"`
	CreatedAt      time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time       `db:"updated_at" json:"updated_at"`
}
