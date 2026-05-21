package repo

import (
	"context"

	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ClassRepo struct {
	db *sqlx.DB
}

func NewClassRepo(db *sqlx.DB) *ClassRepo {
	return &ClassRepo{db: db}
}

func (r *ClassRepo) Create(ctx context.Context, c *models.Class) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `INSERT INTO classes (id, organization_id, name, type, level_id) 
	          VALUES (:id, :organization_id, :name, :type, :level_id)`
	_, err = tx.NamedExecContext(ctx, query, c)
	if err != nil {
		return err
	}

	for _, item := range c.Curriculum {
		_, err = tx.ExecContext(ctx, "INSERT INTO curriculum_items (class_id, subject_id, periods_per_week, binding_id) VALUES ($1, $2, $3, $4)", c.ID, item.SubjectID, item.PeriodsPerWeek, item.BindingID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *ClassRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.Class, error) {
	var classes []models.Class
	query := `SELECT * FROM classes WHERE organization_id = $1 ORDER BY id`
	err := r.db.SelectContext(ctx, &classes, query, orgID)
	if err != nil {
		return nil, err
	}

	if len(classes) == 0 {
		return classes, nil
	}

	classIDs := make([]uuid.UUID, len(classes))
	classMap := make(map[uuid.UUID]*models.Class)
	for i := range classes {
		classIDs[i] = classes[i].ID
		classes[i].Curriculum = []models.CurriculumItem{} // Initialize to empty slice
		classMap[classes[i].ID] = &classes[i]
	}

	var items []models.CurriculumItem
	inQuery, args, err := sqlx.In("SELECT * FROM curriculum_items WHERE class_id IN (?) ORDER BY subject_id", classIDs)
	if err != nil {
		return classes, nil
	}
	err = r.db.SelectContext(ctx, &items, r.db.Rebind(inQuery), args...)
	if err == nil {
		for _, item := range items {
			if c, ok := classMap[item.ClassID]; ok {
				c.Curriculum = append(c.Curriculum, item)
			}
		}
	}

	return classes, nil
}

func (r *ClassRepo) DeleteAll(ctx context.Context, orgID uuid.UUID) error {
	query := `DELETE FROM classes WHERE organization_id = $1`
	_, err := r.db.ExecContext(ctx, query, orgID)
	return err
}

func (r *ClassRepo) Get(ctx context.Context, id uuid.UUID) (*models.Class, error) {
	var c models.Class
	query := `SELECT * FROM classes WHERE id = $1`
	err := r.db.GetContext(ctx, &c, query, id)
	if err != nil {
		return nil, err
	}

	var items []models.CurriculumItem
	err = r.db.SelectContext(ctx, &items, "SELECT * FROM curriculum_items WHERE class_id = $1", c.ID)
	if err == nil {
		c.Curriculum = items
	}

	return &c, nil
}

func (r *ClassRepo) Update(ctx context.Context, c *models.Class) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE classes SET name = :name, type = :type, level_id = :level_id 
	          WHERE id = :id AND organization_id = :organization_id`
	_, err = tx.NamedExecContext(ctx, query, c)
	if err != nil {
		return err
	}

	// Sync curriculum: delete old ones and insert new ones
	_, err = tx.ExecContext(ctx, "DELETE FROM curriculum_items WHERE class_id = $1", c.ID)
	if err != nil {
		return err
	}

	for _, item := range c.Curriculum {
		_, err = tx.ExecContext(ctx, "INSERT INTO curriculum_items (class_id, subject_id, periods_per_week, binding_id) VALUES ($1, $2, $3, $4)", c.ID, item.SubjectID, item.PeriodsPerWeek, item.BindingID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *ClassRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM classes WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}
