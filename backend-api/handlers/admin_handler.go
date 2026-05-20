package handlers

import (
	"github.com/chrono-school/backend-api/db/repo"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"net/http"
)

type AdminHandler struct {
	teacherRepo *repo.TeacherRepo
	subjectRepo *repo.SubjectRepo
	classRepo   *repo.ClassRepo
}

func NewAdminHandler(teacherRepo *repo.TeacherRepo, subjectRepo *repo.SubjectRepo, classRepo *repo.ClassRepo) *AdminHandler {
	return &AdminHandler{
		teacherRepo: teacherRepo,
		subjectRepo: subjectRepo,
		classRepo:   classRepo,
	}
}

type ClearDataRequest struct {
	Teachers bool `json:"teachers"`
	Subjects bool `json:"subjects"`
	Classes  bool `json:"classes"`
}

func (h *AdminHandler) ClearData(c echo.Context) error {
	var req ClearDataRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	ctx := c.Request().Context()
	orgID, _ := uuid.Parse("00000000-0000-0000-0000-000000000000") // TODO: from auth

	if req.Classes {
		if err := h.classRepo.DeleteAll(ctx, orgID); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to clear classes"})
		}
	}

	if req.Teachers {
		if err := h.teacherRepo.DeleteAll(ctx, orgID); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to clear teachers"})
		}
	}

	if req.Subjects {
		if err := h.subjectRepo.DeleteAll(ctx, orgID); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to clear subjects"})
		}
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Data cleared successfully"})
}
