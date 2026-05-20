# ChronoSchool Backend API

The Backend API manages school resources (teachers, subjects, classes) and orchestrates scheduling jobs.

## Tech Stack
- **Language:** Go 1.22+
- **Framework:** Echo
- **Database:** PostgreSQL

## Setup
1. Install dependencies:
   ```bash
   go mod download
   ```

## Running the Service
```bash
go run main.go
```

## Environment Variables
- `DB_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string for job queue.

## API Interface
See [interface.md](interface.md) for detailed API specifications.
