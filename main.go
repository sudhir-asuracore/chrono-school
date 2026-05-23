package main

import (
	"context"
	"embed"
	"log"
	"net/http"
	"os"
	"runtime"

	"desktop-app/internal/handlers"
	"desktop-app/internal/repo"
	"desktop-app/internal/worker"

	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "modernc.org/sqlite"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed internal/db/sqlite_init.sql
var schemaSQL string

func main() {
	// 1. Initialize Backend
	dbPath := "chronoschool.db"
	db, err := sqlx.Connect("sqlite", dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	_, _ = db.Exec("PRAGMA journal_mode=WAL;")

	// Run migrations
	if _, err := db.Exec(schemaSQL); err != nil {
		log.Printf("Warning: migrations failed: %v", err)
	}
	_, _ = db.Exec("INSERT OR IGNORE INTO organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization')")

	// Try to find solver in bin/ or current dir
	solverName := "solver"
	if runtime.GOOS == "windows" {
		solverName += ".exe"
	}

	solverCmd := "./bin/" + solverName
	if _, err := os.Stat(solverCmd); os.IsNotExist(err) {
		solverCmd = "./" + solverName // Fallback for built app
	}

	jobRepo := repo.NewJobRepo(db)
	internalWorker := worker.NewWorker(jobRepo, solverCmd)
	go internalWorker.Start(context.Background())

	// Start Echo API server in goroutine
	go startAPIServer(db, internalWorker)

	// 2. Initialize Wails
	app := NewApp()
	err = wails.Run(&options.App{
		Title:  "ChronoSchool Desktop",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func startAPIServer(db *sqlx.DB, internalWorker *worker.Worker) {
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
	jobHandler := handlers.NewJobHandler(jobRepo, teacherRepo, subjectRepo, classRepo, roomRepo, educationalLevelRepo, internalWorker)
	adminHandler := handlers.NewAdminHandler(teacherRepo, subjectRepo, classRepo, roomRepo, educationalLevelRepo, savedTimetableRepo)
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

	log.Fatal(e.Start(":8080"))
}
