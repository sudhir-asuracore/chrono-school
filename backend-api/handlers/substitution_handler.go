package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type SubstitutionHandler struct {
	teacherRepo        *repo.TeacherRepo
	savedTimetableRepo *repo.SavedTimetableRepo
}

func NewSubstitutionHandler(tr *repo.TeacherRepo, str *repo.SavedTimetableRepo) *SubstitutionHandler {
	return &SubstitutionHandler{
		teacherRepo:        tr,
		savedTimetableRepo: str,
	}
}

type Recommendation struct {
	TeacherID   uuid.UUID `json:"teacher_id"`
	TeacherName string    `json:"teacher_name"`
	Reason      string    `json:"reason"`
}

func (h *SubstitutionHandler) GetRecommendations(c echo.Context) error {
	ctx := c.Request().Context()
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000") // TODO: from auth

	timetableID, err := uuid.Parse(c.QueryParam("timetable_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid timetable_id")
	}

	day := c.QueryParam("day")
	slot, _ := strconv.Atoi(c.QueryParam("slot"))
	subjectID, _ := uuid.Parse(c.QueryParam("subject_id"))
	levelID, _ := uuid.Parse(c.QueryParam("level_id"))

	// 1. Get Timetable
	timetable, err := h.savedTimetableRepo.Get(ctx, timetableID, orgID)
	if err != nil {
		return c.JSON(http.StatusNotFound, "timetable not found")
	}

	var schedule []models.SolverScheduleEntry
	if err := json.Unmarshal(timetable.Data, &schedule); err != nil {
		return c.JSON(http.StatusInternalServerError, "failed to parse schedule")
	}

	// 2. Get all teachers
	teachers, err := h.teacherRepo.List(ctx, orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	// 3. Find who is busy at (day, slot)
	busyTeachers := make(map[string]bool)
	for _, entry := range schedule {
		if entry.Day == day && entry.SlotIndex == slot {
			busyTeachers[entry.TeacherID] = true
		}
	}

	// 4. Filter qualified and free teachers
	recommendations := make([]Recommendation, 0)
	for _, t := range teachers {
		// Is qualified?
		isQualified := false
		for _, q := range t.Qualifications {
			if q.SubjectID == subjectID && (levelID == uuid.Nil || q.LevelID == levelID) {
				isQualified = true
				break
			}
		}
		if !isQualified {
			continue
		}

		// Is busy in schedule?
		if busyTeachers[t.ID.String()] {
			continue
		}

		// Is available in matrix?
		if t.AvailabilityMatrix != nil && len(*t.AvailabilityMatrix) > 0 {
			var am [][]bool
			_ = json.Unmarshal(*t.AvailabilityMatrix, &am)

			// We need the day index. This is a bit tricky without knowing the days array.
			// For now, let's assume we can map day string to index if we had the snapshot.
			// But wait, the snapshot is in timetable.InputSnapshot!
			var inputSnapshot models.SolverSolveRequest
			_ = json.Unmarshal(timetable.InputSnapshot, &inputSnapshot)

			dayIdx := -1
			for i, d := range inputSnapshot.Settings.Days {
				if d == day {
					dayIdx = i
					break
				}
			}

			if dayIdx != -1 && dayIdx < len(am) && slot < len(am[dayIdx]) {
				if !am[dayIdx][slot] {
					continue // Explicitly unavailable
				}
			}
		}

		recommendations = append(recommendations, Recommendation{
			TeacherID:   t.ID,
			TeacherName: t.Name,
			Reason:      "Qualified and free at this time",
		})
	}

	return c.JSON(http.StatusOK, recommendations)
}
