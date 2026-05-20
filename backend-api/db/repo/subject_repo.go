package repo

import (
	"context"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SubjectRepo struct {
	db *sqlx.DB
}

func NewSubjectRepo(db *sqlx.DB) *SubjectRepo {
	return &SubjectRepo{db: db}
}

func (r *SubjectRepo) Create(ctx context.Context, s *models.Subject) error {
	query := `INSERT INTO subjects (id, organization_id, name, requires_double_period, color) 
	          VALUES (:id, :organization_id, :name, :requires_double_period, :color)`
	_, err := r.db.NamedExecContext(ctx, query, s)
	return err
}

func (r *SubjectRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.Subject, error) {
	var subjects []models.Subject
	query := `SELECT * FROM subjects WHERE organization_id = $1 ORDER BY id`
	err := r.db.SelectContext(ctx, &subjects, query, orgID)
	return subjects, err
}

func (r *SubjectRepo) Get(ctx context.Context, id uuid.UUID) (*models.Subject, error) {
	var s models.Subject
	query := `SELECT * FROM subjects WHERE id = $1`
	err := r.db.GetContext(ctx, &s, query, id)
	return &s, err
}

func (r *SubjectRepo) Update(ctx context.Context, s *models.Subject) error {
	query := `UPDATE subjects SET name = :name, requires_double_period = :requires_double_period, color = :color 
	          WHERE id = :id AND organization_id = :organization_id`
	_, err := r.db.NamedExecContext(ctx, query, s)
	return err
}

func (r *SubjectRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM subjects WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *SubjectRepo) DeleteAll(ctx context.Context, orgID uuid.UUID) error {
	query := `DELETE FROM subjects WHERE organization_id = $1`
	_, err := r.db.ExecContext(ctx, query, orgID)
	return err
}
