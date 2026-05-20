package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

const (
	TypeTimetableSolve = "timetable:solve"
)

type TimetableSolvePayload struct {
	JobID string `json:"job_id"`
}

type Worker struct {
	db        *sqlx.DB
	solverURL string
}

func (w *Worker) ProcessTask(ctx context.Context, t *asynq.Task) error {
	if t.Type() != TypeTimetableSolve {
		return fmt.Errorf("unexpected task type: %s", t.Type())
	}

	var p TimetableSolvePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	jobID, err := uuid.Parse(p.JobID)
	if err != nil {
		return fmt.Errorf("invalid job id: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf("Processing job %s", jobID)

	// 1. Fetch job from DB
	var job struct {
		Payload []byte `db:"payload"`
	}
	err = w.db.GetContext(ctx, &job, "SELECT payload FROM timetable_jobs WHERE id = $1", jobID)
	if err != nil {
		return fmt.Errorf("failed to fetch job from db: %v", err)
	}

	// 2. Update status to PROCESSING
	_, err = w.db.ExecContext(ctx, "UPDATE timetable_jobs SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1", jobID)
	if err != nil {
		return fmt.Errorf("failed to update job status: %v", err)
	}

	// 3. Call Core Engine
	resp, err := http.Post(w.solverURL+"/solve", "application/json", bytes.NewBuffer(job.Payload))
	if err != nil {
		w.handleFailure(ctx, jobID, fmt.Sprintf("failed to call solver: %v", err))
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.handleFailure(ctx, jobID, fmt.Sprintf("failed to read solver response: %v", err))
		return err
	}

	if resp.StatusCode != http.StatusOK {
		w.handleFailure(ctx, jobID, fmt.Sprintf("solver returned non-200 status: %d, body: %s", resp.StatusCode, string(body)))
		return fmt.Errorf("solver error: %d", resp.StatusCode)
	}

	// 4. Save result and update status to COMPLETED
	_, err = w.db.ExecContext(ctx, "UPDATE timetable_jobs SET status = 'COMPLETED', result = $1, updated_at = NOW() WHERE id = $2", body, jobID)
	if err != nil {
		return fmt.Errorf("failed to save job result: %v", err)
	}

	log.Printf("Job %s completed successfully", jobID)
	return nil
}

func (w *Worker) handleFailure(ctx context.Context, jobID uuid.UUID, errMsg string) {
	_, err := w.db.ExecContext(ctx, "UPDATE timetable_jobs SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE id = $2", errMsg, jobID)
	if err != nil {
		log.Printf("Failed to update failure status for job %s: %v", jobID, err)
	}
}

func main() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "127.0.0.1:6379"
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/chronoschool?sslmode=disable"
	}

	solverURL := os.Getenv("SOLVER_URL")
	if solverURL == "" {
		solverURL = "http://core-engine:8000"
	}

	var db *sqlx.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = sqlx.Connect("postgres", dbURL)
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisURL},
		asynq.Config{
			Concurrency: 4, // Respecting MAX_CONCURRENT_SOLVERS implicitly
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	worker := &Worker{db: db, solverURL: solverURL}

	mux := asynq.NewServeMux()
	mux.Handle(TypeTimetableSolve, worker)

	if err := srv.Run(mux); err != nil {
		log.Fatalf("could not run server: %v", err)
	}
}
