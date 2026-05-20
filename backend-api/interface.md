# Interface: Backend API & Gateway

The Backend API is the central conductor of the ChronoSchool system, handling resource management and scheduling job orchestration.

## Communication Protocol
- **Protocol:** HTTPS
- **Format:** JSON

## Endpoints

### Authentication
*Uses JWT tokens (issued by SaaS wrapper or local auth).*

### Resource Management (CRUD)

#### Teachers
- `GET /api/v1/teachers` - List all teachers
- `POST /api/v1/teachers` - Create a new teacher
- `GET /api/v1/teachers/{id}` - Get teacher details
- `PUT /api/v1/teachers/{id}` - Update teacher
- `DELETE /api/v1/teachers/{id}` - Delete teacher

#### Subjects
- `GET /api/v1/subjects`
- `POST /api/v1/subjects`
- `GET /api/v1/subjects/{id}`
- `PUT /api/v1/subjects/{id}`
- `DELETE /api/v1/subjects/{id}`

#### Classes
- `GET /api/v1/classes`
- `POST /api/v1/classes`
- `GET /api/v1/classes/{id}`
- `PUT /api/v1/classes/{id}`
- `DELETE /api/v1/classes/{id}`

### Scheduling Jobs

#### `POST /api/v1/jobs`
Triggers a new timetable generation job.
- **Request:** Resource snapshot (optional, defaults to current state).
- **Response:** `202 Accepted` with `job_id`.

#### `GET /api/v1/jobs/{id}`
Polls for the status of a specific job.
- **Response Statuses:** `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

#### `GET /api/v1/jobs/{id}/result`
Retrieves the generated timetable if the job status is `COMPLETED`.

## Real-time Updates
- **SSE/WebSockets:** Available at `/api/v1/stream` for job status updates.
