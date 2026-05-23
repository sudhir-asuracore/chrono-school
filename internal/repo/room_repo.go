package repo

import (
	"context"

	"desktop-app/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type RoomRepo struct {
	db *sqlx.DB
}

func NewRoomRepo(db *sqlx.DB) *RoomRepo {
	return &RoomRepo{db: db}
}

func (r *RoomRepo) Create(ctx context.Context, rm *models.Room) error {
	query := `INSERT INTO rooms (id, organization_id, name, type) 
	          VALUES (:id, :organization_id, :name, :type)`
	_, err := r.db.NamedExecContext(ctx, query, rm)
	return err
}

func (r *RoomRepo) List(ctx context.Context, orgID uuid.UUID) ([]models.Room, error) {
	var rooms []models.Room
	query := `SELECT * FROM rooms WHERE organization_id = ? ORDER BY id`
	err := r.db.SelectContext(ctx, &rooms, query, orgID)
	return rooms, err
}

func (r *RoomRepo) Get(ctx context.Context, id uuid.UUID) (*models.Room, error) {
	var rm models.Room
	query := `SELECT * FROM rooms WHERE id = ?`
	err := r.db.GetContext(ctx, &rm, query, id)
	return &rm, err
}

func (r *RoomRepo) Update(ctx context.Context, rm *models.Room) error {
	query := `UPDATE rooms SET name = :name, type = :type 
	          WHERE id = :id AND organization_id = :organization_id`
	_, err := r.db.NamedExecContext(ctx, query, rm)
	return err
}

func (r *RoomRepo) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM rooms WHERE id = ? AND organization_id = ?`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *RoomRepo) DeleteAll(ctx context.Context, orgID uuid.UUID) error {
	query := `DELETE FROM rooms WHERE organization_id = ?`
	_, err := r.db.ExecContext(ctx, query, orgID)
	return err
}
