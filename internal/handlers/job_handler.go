package handlers

import (
	"encoding/json"
	"net/http"

	"desktop-app/internal/models"
	"desktop-app/internal/repo"
	"desktop-app/internal/worker"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type JobHandler struct {
	jobRepo     *repo.JobRepo
	teacherRepo *repo.TeacherRepo
	subjectRepo *repo.SubjectRepo
	classRepo   *repo.ClassRepo
	roomRepo    *repo.RoomRepo
	levelRepo   *repo.EducationalLevelRepo
	worker      *worker.Worker
}

func NewJobHandler(jr *repo.JobRepo, tr *repo.TeacherRepo, sr *repo.SubjectRepo, cr *repo.ClassRepo, rr *repo.RoomRepo, lr *repo.EducationalLevelRepo, w *worker.Worker) *JobHandler {
	return &JobHandler{
		jobRepo:     jr,
		teacherRepo: tr,
		subjectRepo: sr,
		classRepo:   cr,
		roomRepo:    rr,
		levelRepo:   lr,
		worker:      w,
	}
}

func (h *JobHandler) Create(c echo.Context) error {
	ctx := c.Request().Context()
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000") // TODO: from auth

	type CreateJobRequest struct {
		PreAssigned      []models.SolverScheduleEntry   `json:"pre_assigned"`
		Holidays         []models.SolverHoliday         `json:"holidays"`
		TeacherVacations []models.SolverTeacherVacation `json:"teacher_vacations"`
	}
	var req CreateJobRequest
	_ = c.Bind(&req)

	// 1. Snapshot state
	teachers, _ := h.teacherRepo.List(ctx, orgID)
	subjects, _ := h.subjectRepo.List(ctx, orgID)
	classes, _ := h.classRepo.List(ctx, orgID)
	rooms, _ := h.roomRepo.List(ctx, orgID)
	levels, _ := h.levelRepo.List(ctx, orgID)

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
		PreAssigned:      req.PreAssigned,
		Holidays:         req.Holidays,
		TeacherVacations: req.TeacherVacations,
		Teachers:         []models.SolverTeacher{},
		Subjects:         []models.SolverSubject{},
		Rooms:            []models.SolverRoom{},
		Classes:          []models.SolverClass{},
		Levels:           []models.SolverEducationalLevel{},
	}

	if solverReq.PreAssigned == nil {
		solverReq.PreAssigned = []models.SolverScheduleEntry{}
	}
	if solverReq.Holidays == nil {
		solverReq.Holidays = []models.SolverHoliday{}
	}
	if solverReq.TeacherVacations == nil {
		solverReq.TeacherVacations = []models.SolverTeacherVacation{}
	}

	for _, t := range teachers {
		var am [][]bool
		if t.AvailabilityMatrix != nil && len(*t.AvailabilityMatrix) > 0 {
			_ = json.Unmarshal(*t.AvailabilityMatrix, &am)
		}
		st := models.SolverTeacher{
			ID:                 t.ID.String(),
			Name:               t.Name,
			MaxSlotsPerWeek:    t.MaxSlotsPerWeek,
			AvailabilityMatrix: am,
			Qualifications:     []models.SolverTeacherQualification{},
		}
		for _, q := range t.Qualifications {
			st.Qualifications = append(st.Qualifications, models.SolverTeacherQualification{
				SubjectID: q.SubjectID.String(),
				LevelID:   q.LevelID.String(),
			})
		}
		solverReq.Teachers = append(solverReq.Teachers, st)
	}

	for _, s := range subjects {
		solverReq.Subjects = append(solverReq.Subjects, models.SolverSubject{
			ID:                   s.ID.String(),
			Name:                 s.Name,
			RequiresDoublePeriod: s.RequiresDoublePeriod,
			RequiredRoomType:     s.RequiredRoomType,
		})
	}

	for _, r := range rooms {
		solverReq.Rooms = append(solverReq.Rooms, models.SolverRoom{
			ID:   r.ID.String(),
			Name: r.Name,
			Type: r.Type,
		})
	}

	for _, l := range levels {
		solverReq.Levels = append(solverReq.Levels, models.SolverEducationalLevel{
			ID:   l.ID.String(),
			Name: l.Name,
		})
	}

	for _, cl := range classes {
		levelID := ""
		if cl.LevelID != nil {
			levelID = cl.LevelID.String()
		}
		sc := models.SolverClass{
			ID:      cl.ID.String(),
			Name:    cl.Name,
			Type:    cl.Type,
			LevelID: levelID,
		}
		for _, item := range cl.Curriculum {
			sc.Curriculum = append(sc.Curriculum, models.SolverCurriculumItem{
				SubjectID:      item.SubjectID.String(),
				PeriodsPerWeek: item.PeriodsPerWeek,
				BindingID:      item.BindingID,
			})
		}
		solverReq.Classes = append(solverReq.Classes, sc)
	}

	payload, err := json.Marshal(solverReq)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to serialize solver request"})
	}

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
	h.worker.Enqueue(job.ID)

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

	if job.Result == nil || len(*job.Result) == 0 {
		return c.JSON(http.StatusNotFound, "Result not found")
	}

	return c.Blob(http.StatusOK, "application/json", *job.Result)
}
