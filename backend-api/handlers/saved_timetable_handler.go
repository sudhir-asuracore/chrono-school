package handlers

import (
	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"net/http"
)

type SavedTimetableHandler struct {
	repo *repo.SavedTimetableRepo
}

func NewSavedTimetableHandler(repo *repo.SavedTimetableRepo) *SavedTimetableHandler {
	return &SavedTimetableHandler{repo: repo}
}

func (h *SavedTimetableHandler) Create(c echo.Context) error {
	t := new(models.SavedTimetable)
	if err := c.Bind(t); err != nil {
		return err
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	t.OrganizationID = orgID

	if err := h.repo.Create(c.Request().Context(), t); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, t)
}

func (h *SavedTimetableHandler) List(c echo.Context) error {
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	timetables, err := h.repo.List(c.Request().Context(), orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, timetables)
}

func (h *SavedTimetableHandler) Get(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")

	timetable, err := h.repo.Get(c.Request().Context(), id, orgID)
	if err != nil {
		return c.JSON(http.StatusNotFound, "timetable not found")
	}
	return c.JSON(http.StatusOK, timetable)
}

func (h *SavedTimetableHandler) Delete(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")

	if err := h.repo.Delete(c.Request().Context(), id, orgID); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *SavedTimetableHandler) Update(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}

	t := new(models.SavedTimetable)
	if err := c.Bind(t); err != nil {
		return err
	}
	t.ID = id
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	t.OrganizationID = orgID

	if err := h.repo.Update(c.Request().Context(), t); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, t)
}
