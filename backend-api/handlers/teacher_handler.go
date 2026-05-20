package handlers

import (
	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"net/http"
)

type TeacherHandler struct {
	repo *repo.TeacherRepo
}

func NewTeacherHandler(repo *repo.TeacherRepo) *TeacherHandler {
	return &TeacherHandler{repo: repo}
}

func (h *TeacherHandler) Create(c echo.Context) error {
	t := new(models.Teacher)
	if err := c.Bind(t); err != nil {
		return err
	}
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	// TODO: Get orgID from auth context
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	t.OrganizationID = orgID

	if err := h.repo.Create(c.Request().Context(), t); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, t)
}

func (h *TeacherHandler) List(c echo.Context) error {
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	teachers, err := h.repo.List(c.Request().Context(), orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, teachers)
}

func (h *TeacherHandler) Update(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}

	t := new(models.Teacher)
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

func (h *TeacherHandler) Delete(c echo.Context) error {
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
