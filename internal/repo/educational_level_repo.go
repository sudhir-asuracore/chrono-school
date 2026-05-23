package repo

import (
	"context"

	"desktop-app/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type EducationalLevelRepo struct {
	db *sqlx.DB
}

func NewEducationalLevelRepo(db *sqlx.DB) *EducationalLevelRepo {
	return &EducationalLevelRepo{db: db}
}

func (r *EducationalLevelRepo) Create(ctx context.Context, l *models.EducationalLevel) error {
	query := `INSERT INTO educational_levels (id, organization_id, name) 
	          VALUES (:id, :organization_id, :name)`
	_, err := r.db.NamedExecContext(ctx, query, l)
	return err
}

func (r *EducationalLevelRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.EducationalLevel, error) {
	var levels []models.EducationalLevel
	query := `SELECT * FROM educational_levels WHERE organization_id = ? ORDER BY created_at`
	err := r.db.SelectContext(ctx, &levels, query, orgID)
	return levels, err
}

func (r *EducationalLevelRepo) Get(ctx context.Context, id uuid.UUID) (*models.EducationalLevel, error) {
	var l models.EducationalLevel
	query := `SELECT * FROM educational_levels WHERE id = ?`
	err := r.db.GetContext(ctx, &l, query, id)
	return &l, err
}

func (r *EducationalLevelRepo) Update(ctx context.Context, l *models.EducationalLevel) error {
	query := `UPDATE educational_levels SET name = :name
	          WHERE id = :id AND organization_id = :organization_id`
	_, err := r.db.NamedExecContext(ctx, query, l)
	return err
}

func (r *EducationalLevelRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM educational_levels WHERE id = ? AND organization_id = ?`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *EducationalLevelRepo) DeleteAll(ctx context.Context, orgID uuid.UUID) error {
	query := `DELETE FROM educational_levels WHERE organization_id = ?`
	_, err := r.db.ExecContext(ctx, query, orgID)
	return err
}
