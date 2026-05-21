package handlers

import (
	"net/http"

	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type ClassHandler struct {
	repo               *repo.ClassRepo
	savedTimetableRepo *repo.SavedTimetableRepo
}

func NewClassHandler(repo *repo.ClassRepo, savedTimetableRepo *repo.SavedTimetableRepo) *ClassHandler {
	return &ClassHandler{repo: repo, savedTimetableRepo: savedTimetableRepo}
}

func (h *ClassHandler) Create(c echo.Context) error {
	class := new(models.Class)
	if err := c.Bind(class); err != nil {
		return err
	}
	if class.ID == uuid.Nil {
		class.ID = uuid.New()
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	class.OrganizationID = orgID

	if err := h.repo.Create(c.Request().Context(), class); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, class)
}

func (h *ClassHandler) List(c echo.Context) error {
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	classes, err := h.repo.List(c.Request().Context(), orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, classes)
}

func (h *ClassHandler) Update(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}

	class := new(models.Class)
	if err := c.Bind(class); err != nil {
		return err
	}
	class.ID = id
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	class.OrganizationID = orgID

	if err := h.repo.Update(c.Request().Context(), class); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) Delete(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")

	if err := h.repo.Delete(c.Request().Context(), id, orgID); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	// Mark timetables as stale
	if err := h.savedTimetableRepo.MarkAsStaleIfUsing(c.Request().Context(), orgID, "class", id); err != nil {
		// Log error but don't fail the delete
		c.Logger().Errorf("failed to mark timetables as stale for class %s: %v", id, err)
	}

	return c.NoContent(http.StatusNoContent)
}
