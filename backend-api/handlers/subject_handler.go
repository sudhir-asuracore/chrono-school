package handlers

import (
	"net/http"

	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type SubjectHandler struct {
	repo               *repo.SubjectRepo
	savedTimetableRepo *repo.SavedTimetableRepo
	teacherRepo        *repo.TeacherRepo
}

func NewSubjectHandler(repo *repo.SubjectRepo, savedTimetableRepo *repo.SavedTimetableRepo, teacherRepo *repo.TeacherRepo) *SubjectHandler {
	return &SubjectHandler{repo: repo, savedTimetableRepo: savedTimetableRepo, teacherRepo: teacherRepo}
}

func (h *SubjectHandler) Create(c echo.Context) error {
	s := new(models.Subject)
	if err := c.Bind(s); err != nil {
		return err
	}
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	// TODO: Get orgID from auth context
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	s.OrganizationID = orgID

	if err := h.repo.Create(c.Request().Context(), s); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, s)
}

func (h *SubjectHandler) List(c echo.Context) error {
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	subjects, err := h.repo.List(c.Request().Context(), orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, subjects)
}

func (h *SubjectHandler) Update(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}

	s := new(models.Subject)
	if err := c.Bind(s); err != nil {
		return err
	}
	s.ID = id
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	s.OrganizationID = orgID

	if err := h.repo.Update(c.Request().Context(), s); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, s)
}

func (h *SubjectHandler) Delete(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")

	// Mark teachers as stale before deleting the subject
	if err := h.teacherRepo.MarkAsStaleBySubject(c.Request().Context(), orgID, id); err != nil {
		// Log error but don't fail the delete
		c.Logger().Errorf("failed to mark teachers as stale for subject %s: %v", id, err)
	}

	if err := h.repo.Delete(c.Request().Context(), id, orgID); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	// Mark timetables as stale
	if err := h.savedTimetableRepo.MarkAsStaleIfUsing(c.Request().Context(), orgID, "subject", id); err != nil {
		// Log error but don't fail the delete
		c.Logger().Errorf("failed to mark timetables as stale for subject %s: %v", id, err)
	}

	return c.NoContent(http.StatusNoContent)
}
