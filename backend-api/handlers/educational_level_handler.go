package handlers

import (
	"net/http"

	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type EducationalLevelHandler struct {
	repo *repo.EducationalLevelRepo
}

func NewEducationalLevelHandler(repo *repo.EducationalLevelRepo) *EducationalLevelHandler {
	return &EducationalLevelHandler{repo: repo}
}

func (h *EducationalLevelHandler) Create(c echo.Context) error {
	l := new(models.EducationalLevel)
	if err := c.Bind(l); err != nil {
		return err
	}
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	l.OrganizationID = orgID

	if err := h.repo.Create(c.Request().Context(), l); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, l)
}

func (h *EducationalLevelHandler) List(c echo.Context) error {
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	levels, err := h.repo.List(c.Request().Context(), orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, levels)
}

func (h *EducationalLevelHandler) Update(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}

	l := new(models.EducationalLevel)
	if err := c.Bind(l); err != nil {
		return err
	}
	l.ID = id
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	l.OrganizationID = orgID

	if err := h.repo.Update(c.Request().Context(), l); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, l)
}

func (h *EducationalLevelHandler) Delete(c echo.Context) error {
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
