package repo

import (
	"context"

	"desktop-app/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type JobRepo struct {
	db *sqlx.DB
}

func NewJobRepo(db *sqlx.DB) *JobRepo {
	return &JobRepo{db: db}
}

func (r *JobRepo) Create(ctx context.Context, j *models.TimetableJob) error {
	query := `INSERT INTO timetable_jobs (id, organization_id, status, payload) 
	          VALUES (:id, :organization_id, :status, :payload)`
	_, err := r.db.NamedExecContext(ctx, query, j)
	return err
}

func (r *JobRepo) Get(ctx context.Context, id uuid.UUID) (*models.TimetableJob, error) {
	var j models.TimetableJob
	query := `SELECT * FROM timetable_jobs WHERE id = ?`
	err := r.db.GetContext(ctx, &j, query, id)
	return &j, err
}

func (r *JobRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE timetable_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *JobRepo) SaveResult(ctx context.Context, id uuid.UUID, result []byte) error {
	query := `UPDATE timetable_jobs SET status = 'COMPLETED', result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, result, id)
	return err
}

func (r *JobRepo) MarkAsFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	query := `UPDATE timetable_jobs SET status = 'FAILED', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, errMsg, id)
	return err
}
