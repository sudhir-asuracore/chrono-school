package worker

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os/exec"

	"desktop-app/internal/repo"
	"github.com/google/uuid"
)

type Worker struct {
	jobRepo   *repo.JobRepo
	solverCmd string
	queue     chan uuid.UUID
}

func NewWorker(jr *repo.JobRepo, solverCmd string) *Worker {
	return &Worker{
		jobRepo:   jr,
		solverCmd: solverCmd,
		queue:     make(chan uuid.UUID, 100),
	}
}

func (w *Worker) Enqueue(jobID uuid.UUID) {
	w.queue <- jobID
}

func (w *Worker) Start(ctx context.Context) {
	log.Println("Internal job worker started")
	for {
		select {
		case <-ctx.Done():
			return
		case jobID := <-w.queue:
			err := w.processJob(ctx, jobID)
			if err != nil {
				log.Printf("Error processing job %s: %v", jobID, err)
			}
		}
	}
}

func (w *Worker) processJob(ctx context.Context, jobID uuid.UUID) error {
	log.Printf("Processing job %s", jobID)

	// 1. Fetch job
	job, err := w.jobRepo.Get(ctx, jobID)
	if err != nil {
		return fmt.Errorf("failed to fetch job: %v", err)
	}

	// 2. Update status to PROCESSING
	err = w.jobRepo.UpdateStatus(ctx, jobID, "PROCESSING")
	if err != nil {
		return fmt.Errorf("failed to update status: %v", err)
	}

	// 3. Call Solver
	var result []byte
	if w.solverCmd != "" {
		result, err = w.callSolverSubprocess(ctx, job.Payload)
	} else {
		return fmt.Errorf("no solver command configured")
	}

	if err != nil {
		w.handleFailure(ctx, jobID, err.Error())
		return err
	}

	// 4. Save result
	err = w.jobRepo.SaveResult(ctx, jobID, result)
	if err != nil {
		return fmt.Errorf("failed to save result: %v", err)
	}

	log.Printf("Job %s completed successfully", jobID)
	return nil
}

func (w *Worker) callSolverSubprocess(ctx context.Context, payload []byte) ([]byte, error) {
	cmd := exec.CommandContext(ctx, w.solverCmd)
	cmd.Stdin = bytes.NewReader(payload)
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return nil, fmt.Errorf("solver failed: %v, stderr: %s", err, stderr.String())
	}

	return out.Bytes(), nil
}

func (w *Worker) handleFailure(ctx context.Context, jobID uuid.UUID, errMsg string) {
	// Add MarkAsFailed to JobRepo
	_ = w.jobRepo.MarkAsFailed(ctx, jobID, errMsg)
}
