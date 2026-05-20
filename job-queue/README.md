# ChronoSchool Job Queue Worker

The Job Queue worker handles asynchronous timetable generation tasks.

## Tech Stack
- **Language:** Go 1.22+
- **Library:** Asynq (Redis-based)

## Setup
1. Install dependencies:
   ```bash
   go mod download
   ```

## Running the Worker
```bash
go run main.go
```

## Interface
See [interface.md](interface.md) for details.
