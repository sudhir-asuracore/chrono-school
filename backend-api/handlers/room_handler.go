package handlers

import (
	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"net/http"
)

type RoomHandler struct {
	repo *repo.RoomRepo
}

func NewRoomHandler(repo *repo.RoomRepo) *RoomHandler {
	return &RoomHandler{repo: repo}
}

func (h *RoomHandler) Create(c echo.Context) error {
	rm := new(models.Room)
	if err := c.Bind(rm); err != nil {
		return err
	}
	if rm.ID == uuid.Nil {
		rm.ID = uuid.New()
	}
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	rm.OrganizationID = orgID

	if err := h.repo.Create(c.Request().Context(), rm); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, rm)
}

func (h *RoomHandler) List(c echo.Context) error {
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	rooms, err := h.repo.List(c.Request().Context(), orgID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, rooms)
}

func (h *RoomHandler) Update(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "invalid id")
	}

	rm := new(models.Room)
	if err := c.Bind(rm); err != nil {
		return err
	}
	rm.ID = id
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000")
	rm.OrganizationID = orgID

	if err := h.repo.Update(c.Request().Context(), rm); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, rm)
}

func (h *RoomHandler) Delete(c echo.Context) error {
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
