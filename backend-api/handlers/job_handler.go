package handlers

import (
	"encoding/json"
	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/labstack/echo/v4"
	"net/http"
)

type JobHandler struct {
	jobRepo     *repo.JobRepo
	teacherRepo *repo.TeacherRepo
	subjectRepo *repo.SubjectRepo
	classRepo   *repo.ClassRepo
	asynqClient *asynq.Client
}

func NewJobHandler(jr *repo.JobRepo, tr *repo.TeacherRepo, sr *repo.SubjectRepo, cr *repo.ClassRepo, ac *asynq.Client) *JobHandler {
	return &JobHandler{
		jobRepo:     jr,
		teacherRepo: tr,
		subjectRepo: sr,
		classRepo:   cr,
		asynqClient: ac,
	}
}

func (h *JobHandler) Create(c echo.Context) error {
	ctx := c.Request().Context()
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000") // TODO: from auth

	type CreateJobRequest struct {
		PreAssigned []models.SolverScheduleEntry `json:"pre_assigned"`
	}
	var req CreateJobRequest
	_ = c.Bind(&req)

	// 1. Snapshot state
	teachers, _ := h.teacherRepo.List(ctx, orgID)
	subjects, _ := h.subjectRepo.List(ctx, orgID)
	classes, _ := h.classRepo.List(ctx, orgID)

	// Create a map of subject IDs to names/details for easier lookup
	subjMap := make(map[uuid.UUID]models.Subject)
	for _, s := range subjects {
		subjMap[s.ID] = s
	}

	solverReq := models.SolverSolveRequest{
		Settings: models.SolverSettings{
			TimeslotsPerDay:  8,
			Days:             []string{"Mon", "Tue", "Wed", "Thu", "Fri"},
			MaxSearchSeconds: 60,
		},
		FixedBreaks: []models.SolverFixedBreak{
			{Day: "All", SlotIndex: 4, Label: "Lunch Break"},
		},
		PreAssigned: req.PreAssigned,
		Teachers:    []models.SolverTeacher{},
		Subjects:    []models.SolverSubject{},
		Classes:     []models.SolverClass{},
	}

	if solverReq.PreAssigned == nil {
		solverReq.PreAssigned = []models.SolverScheduleEntry{}
	}

	for _, t := range teachers {
		st := models.SolverTeacher{
			ID:              t.ID.String(),
			Name:            t.Name,
			MaxSlotsPerWeek: t.MaxSlotsPerWeek,
		}
		for _, subID := range t.QualifiedSubjects {
			st.QualifiedSubjects = append(st.QualifiedSubjects, subID.String())
		}
		solverReq.Teachers = append(solverReq.Teachers, st)
	}

	for _, s := range subjects {
		solverReq.Subjects = append(solverReq.Subjects, models.SolverSubject{
			ID:                   s.ID.String(),
			Name:                 s.Name,
			RequiresDoublePeriod: s.RequiresDoublePeriod,
		})
	}

	for _, cl := range classes {
		sc := models.SolverClass{
			ID:   cl.ID.String(),
			Name: cl.Name,
			Type: cl.Type,
		}
		for _, item := range cl.Curriculum {
			sc.Curriculum = append(sc.Curriculum, models.SolverCurriculumItem{
				SubjectID:      item.SubjectID.String(),
				PeriodsPerWeek: item.PeriodsPerWeek,
			})
		}
		solverReq.Classes = append(solverReq.Classes, sc)
	}

	payload, _ := json.Marshal(solverReq)

	// 3. Save Job
	job := &models.TimetableJob{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Status:         "PENDING",
		Payload:        payload,
	}

	if err := h.jobRepo.Create(ctx, job); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	// 4. Enqueue in Job Queue
	payloadData, _ := json.Marshal(map[string]string{"job_id": job.ID.String()})
	task := asynq.NewTask("timetable:solve", payloadData)
	if _, err := h.asynqClient.Enqueue(task); err != nil {
		return c.JSON(http.StatusInternalServerError, "Failed to enqueue job: "+err.Error())
	}

	return c.JSON(http.StatusAccepted, job)
}

func (h *JobHandler) Get(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "Invalid ID")
	}

	job, err := h.jobRepo.Get(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, "Job not found")
	}

	return c.JSON(http.StatusOK, job)
}

func (h *JobHandler) GetResult(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "Invalid ID")
	}

	job, err := h.jobRepo.Get(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, "Job not found")
	}

	if job.Status != "COMPLETED" {
		return c.JSON(http.StatusBadRequest, "Job not completed")
	}

	if len(job.Result) == 0 {
		return c.JSON(http.StatusNotFound, "Result not found")
	}

	return c.Blob(http.StatusOK, "application/json", job.Result)
}
