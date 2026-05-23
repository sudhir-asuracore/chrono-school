package repo

import (
	"context"

	"desktop-app/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SavedTimetableRepo struct {
	db *sqlx.DB
}

func NewSavedTimetableRepo(db *sqlx.DB) *SavedTimetableRepo {
	return &SavedTimetableRepo{db: db}
}

func (r *SavedTimetableRepo) Create(ctx context.Context, t *models.SavedTimetable) error {
	query := `INSERT INTO saved_timetables (id, organization_id, name, data, input_snapshot, is_stale) 
	          VALUES (:id, :organization_id, :name, :data, :input_snapshot, :is_stale)`
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	_, err := r.db.NamedExecContext(ctx, query, t)
	return err
}

func (r *SavedTimetableRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.SavedTimetable, error) {
	var results []models.SavedTimetable
	query := `SELECT * FROM saved_timetables WHERE organization_id = ? ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &results, query, orgID)
	return results, err
}

func (r *SavedTimetableRepo) Get(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*models.SavedTimetable, error) {
	var t models.SavedTimetable
	query := `SELECT * FROM saved_timetables WHERE id = ? AND organization_id = ?`
	err := r.db.GetContext(ctx, &t, query, id, orgID)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *SavedTimetableRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM saved_timetables WHERE id = ? AND organization_id = ?`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *SavedTimetableRepo) DeleteAll(ctx context.Context, orgID uuid.UUID) error {
	query := `DELETE FROM saved_timetables WHERE organization_id = ?`
	_, err := r.db.ExecContext(ctx, query, orgID)
	return err
}

func (r *SavedTimetableRepo) Update(ctx context.Context, t *models.SavedTimetable) error {
	query := `UPDATE saved_timetables SET name = :name, data = :data, input_snapshot = :input_snapshot, is_stale = :is_stale, updated_at = CURRENT_TIMESTAMP 
	          WHERE id = :id AND organization_id = :organization_id`
	_, err := r.db.NamedExecContext(ctx, query, t)
	return err
}

func (r *SavedTimetableRepo) MarkAsStaleIfUsing(ctx context.Context, orgID uuid.UUID, entityType string, entityID uuid.UUID) error {
	var query string
	// data is an array of ScheduleEntry: [{teacher_id: "...", subject_id: "...", class_id: "...", ...}, ...]
	// In SQLite we use json_each and json_extract
	switch entityType {
	case "teacher":
		query = `UPDATE saved_timetables SET is_stale = true WHERE organization_id = ? AND EXISTS (SELECT 1 FROM json_each(data) WHERE json_extract(value, '$.teacher_id') = ?)`
	case "subject":
		query = `UPDATE saved_timetables SET is_stale = true WHERE organization_id = ? AND EXISTS (SELECT 1 FROM json_each(data) WHERE json_extract(value, '$.subject_id') = ?)`
	case "class":
		query = `UPDATE saved_timetables SET is_stale = true WHERE organization_id = ? AND EXISTS (SELECT 1 FROM json_each(data) WHERE json_extract(value, '$.class_id') = ?)`
	default:
		return nil
	}
	_, err := r.db.ExecContext(ctx, query, orgID, entityID.String())
	return err
}
