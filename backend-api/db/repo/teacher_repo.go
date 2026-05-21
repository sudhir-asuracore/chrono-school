package repo

import (
	"context"

	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type TeacherRepo struct {
	db *sqlx.DB
}

func NewTeacherRepo(db *sqlx.DB) *TeacherRepo {
	return &TeacherRepo{db: db}
}

func (r *TeacherRepo) Create(ctx context.Context, t *models.Teacher) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `INSERT INTO teachers (id, organization_id, name, max_slots_per_week, color, availability_matrix, is_stale) 
	          VALUES (:id, :organization_id, :name, :max_slots_per_week, :color, :availability_matrix, :is_stale)`
	_, err = tx.NamedExecContext(ctx, query, t)
	if err != nil {
		return err
	}

	for _, qual := range t.Qualifications {
		_, err = tx.ExecContext(ctx, "INSERT INTO teacher_qualifications (teacher_id, subject_id, level_id) VALUES ($1, $2, $3)", t.ID, qual.SubjectID, qual.LevelID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *TeacherRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.Teacher, error) {
	var teachers []models.Teacher
	query := `SELECT * FROM teachers WHERE organization_id = $1 ORDER BY id`
	err := r.db.SelectContext(ctx, &teachers, query, orgID)
	if err != nil {
		return nil, err
	}

	if len(teachers) == 0 {
		return teachers, nil
	}

	teacherIDs := make([]uuid.UUID, len(teachers))
	teacherMap := make(map[uuid.UUID]*models.Teacher)
	for i := range teachers {
		teacherIDs[i] = teachers[i].ID
		teachers[i].Qualifications = []models.TeacherQualification{} // Initialize to empty slice
		teacherMap[teachers[i].ID] = &teachers[i]
	}

	var rels []models.TeacherQualification
	inQuery, args, err := sqlx.In("SELECT teacher_id, subject_id, level_id FROM teacher_qualifications WHERE teacher_id IN (?) ORDER BY subject_id", teacherIDs)
	if err != nil {
		return teachers, nil
	}
	err = r.db.SelectContext(ctx, &rels, r.db.Rebind(inQuery), args...)
	if err == nil {
		for _, rel := range rels {
			if t, ok := teacherMap[rel.TeacherID]; ok {
				t.Qualifications = append(t.Qualifications, rel)
			}
		}
	}

	return teachers, nil
}

func (r *TeacherRepo) Get(ctx context.Context, id uuid.UUID) (*models.Teacher, error) {
	var t models.Teacher
	query := `SELECT * FROM teachers WHERE id = $1`
	err := r.db.GetContext(ctx, &t, query, id)
	if err != nil {
		return nil, err
	}

	var quals []models.TeacherQualification
	err = r.db.SelectContext(ctx, &quals, "SELECT subject_id, level_id FROM teacher_qualifications WHERE teacher_id = $1", t.ID)
	if err == nil {
		t.Qualifications = quals
	}

	return &t, nil
}

func (r *TeacherRepo) DeleteAll(ctx context.Context, orgID uuid.UUID) error {
	query := `DELETE FROM teachers WHERE organization_id = $1`
	_, err := r.db.ExecContext(ctx, query, orgID)
	return err
}

func (r *TeacherRepo) Update(ctx context.Context, t *models.Teacher) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE teachers SET name = :name, max_slots_per_week = :max_slots_per_week, color = :color, availability_matrix = :availability_matrix, is_stale = :is_stale
	          WHERE id = :id AND organization_id = :organization_id`
	_, err = tx.NamedExecContext(ctx, query, t)
	if err != nil {
		return err
	}

	// Sync qualifications: delete old ones and insert new ones
	_, err = tx.ExecContext(ctx, "DELETE FROM teacher_qualifications WHERE teacher_id = $1", t.ID)
	if err != nil {
		return err
	}

	for _, qual := range t.Qualifications {
		_, err = tx.ExecContext(ctx, "INSERT INTO teacher_qualifications (teacher_id, subject_id, level_id) VALUES ($1, $2, $3)", t.ID, qual.SubjectID, qual.LevelID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *TeacherRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM teachers WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *TeacherRepo) MarkAsStaleBySubject(ctx context.Context, orgID uuid.UUID, subjectID uuid.UUID) error {
	query := `UPDATE teachers SET is_stale = true 
	          WHERE organization_id = $1 AND id IN (SELECT teacher_id FROM teacher_qualifications WHERE subject_id = $2)`
	_, err := r.db.ExecContext(ctx, query, orgID, subjectID)
	return err
}
