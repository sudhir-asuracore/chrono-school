package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"

	"github.com/chrono-school/backend-api/db/repo"
	"github.com/chrono-school/backend-api/handlers"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/chronoschool?sslmode=disable"
	}

	var db *sqlx.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = sqlx.Connect("postgres", dbURL)
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to database after retries: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Printf("Warning: migrations failed: %v", err)
	}

	// Ensure default organization
	_, _ = db.Exec("INSERT INTO organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization') ON CONFLICT (id) DO NOTHING")

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "127.0.0.1:6379"
	}
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: redisURL})
	defer asynqClient.Close()

	// Initialize repos
	subjectRepo := repo.NewSubjectRepo(db)
	teacherRepo := repo.NewTeacherRepo(db)
	classRepo := repo.NewClassRepo(db)
	jobRepo := repo.NewJobRepo(db)
	savedTimetableRepo := repo.NewSavedTimetableRepo(db)
	roomRepo := repo.NewRoomRepo(db)
	educationalLevelRepo := repo.NewEducationalLevelRepo(db)

	// Initialize handlers
	subjectHandler := handlers.NewSubjectHandler(subjectRepo, savedTimetableRepo, teacherRepo)
	teacherHandler := handlers.NewTeacherHandler(teacherRepo, savedTimetableRepo)
	classHandler := handlers.NewClassHandler(classRepo, savedTimetableRepo)
	roomHandler := handlers.NewRoomHandler(roomRepo)
	educationalLevelHandler := handlers.NewEducationalLevelHandler(educationalLevelRepo)
	jobHandler := handlers.NewJobHandler(jobRepo, teacherRepo, subjectRepo, classRepo, roomRepo, educationalLevelRepo, asynqClient)
	adminHandler := handlers.NewAdminHandler(teacherRepo, subjectRepo, classRepo, roomRepo, educationalLevelRepo)
	savedTimetableHandler := handlers.NewSavedTimetableHandler(savedTimetableRepo)
	substitutionHandler := handlers.NewSubstitutionHandler(teacherRepo, savedTimetableRepo)

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
	}))

	// Routes
	v1 := e.Group("/api/v1")

	v1.GET("/subjects", subjectHandler.List)
	v1.POST("/subjects", subjectHandler.Create)
	v1.PUT("/subjects/:id", subjectHandler.Update)
	v1.DELETE("/subjects/:id", subjectHandler.Delete)

	v1.GET("/teachers", teacherHandler.List)
	v1.POST("/teachers", teacherHandler.Create)
	v1.PUT("/teachers/:id", teacherHandler.Update)
	v1.DELETE("/teachers/:id", teacherHandler.Delete)

	v1.GET("/classes", classHandler.List)
	v1.POST("/classes", classHandler.Create)
	v1.PUT("/classes/:id", classHandler.Update)
	v1.DELETE("/classes/:id", classHandler.Delete)

	v1.GET("/rooms", roomHandler.List)
	v1.POST("/rooms", roomHandler.Create)
	v1.PUT("/rooms/:id", roomHandler.Update)
	v1.DELETE("/rooms/:id", roomHandler.Delete)

	v1.GET("/levels", educationalLevelHandler.List)
	v1.POST("/levels", educationalLevelHandler.Create)
	v1.PUT("/levels/:id", educationalLevelHandler.Update)
	v1.DELETE("/levels/:id", educationalLevelHandler.Delete)

	v1.GET("/jobs/:id", jobHandler.Get)
	v1.GET("/jobs/:id/result", jobHandler.GetResult)
	v1.POST("/jobs", jobHandler.Create)

	v1.GET("/timetables", savedTimetableHandler.List)
	v1.POST("/timetables", savedTimetableHandler.Create)
	v1.GET("/timetables/:id", savedTimetableHandler.Get)
	v1.PUT("/timetables/:id", savedTimetableHandler.Update)
	v1.DELETE("/timetables/:id", savedTimetableHandler.Delete)

	v1.POST("/admin/clear", adminHandler.ClearData)

	v1.GET("/substitution/recommendations", substitutionHandler.GetRecommendations)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e.Logger.Fatal(e.Start(":" + port))
}

func runMigrations(db *sqlx.DB) error {
	migrations := []string{
		"db/migrations/000001_init_schema.up.sql",
		"db/migrations/000002_add_saved_timetables.up.sql",
		"db/migrations/000003_add_color_to_subjects_and_teachers.up.sql",
		"db/migrations/000004_add_unique_constraints.up.sql",
		"db/migrations/000005_extended_features.up.sql",
		"db/migrations/000006_add_stale_to_timetables.up.sql",
		"db/migrations/000007_add_stale_to_teachers.up.sql",
		"db/migrations/000008_add_educational_levels.up.sql",
	}

	for _, m := range migrations {
		content, err := os.ReadFile(m)
		if err != nil {
			log.Printf("Migration file %s not found: %v", m, err)
			continue
		}
		_, err = db.Exec(string(content))
		if err != nil {
			log.Printf("Failed to run migration %s: %v", m, err)
			return err
		}
		log.Printf("Successfully ran migration %s", m)
	}
	return nil
}
