package repo

import (
	"context"
	"github.com/chrono-school/backend-api/models"
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
	query := `INSERT INTO saved_timetables (id, organization_id, name, data, input_snapshot) 
	          VALUES (:id, :organization_id, :name, :data, :input_snapshot)`
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	_, err := r.db.NamedExecContext(ctx, query, t)
	return err
}

func (r *SavedTimetableRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.SavedTimetable, error) {
	var results []models.SavedTimetable
	query := `SELECT * FROM saved_timetables WHERE organization_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &results, query, orgID)
	return results, err
}

func (r *SavedTimetableRepo) Get(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*models.SavedTimetable, error) {
	var t models.SavedTimetable
	query := `SELECT * FROM saved_timetables WHERE id = $1 AND organization_id = $2`
	err := r.db.GetContext(ctx, &t, query, id, orgID)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *SavedTimetableRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM saved_timetables WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *SavedTimetableRepo) Update(ctx context.Context, t *models.SavedTimetable) error {
	query := `UPDATE saved_timetables SET name = :name, data = :data, input_snapshot = :input_snapshot, updated_at = NOW() 
	          WHERE id = :id AND organization_id = :organization_id`
	_, err := r.db.NamedExecContext(ctx, query, t)
	return err
}
