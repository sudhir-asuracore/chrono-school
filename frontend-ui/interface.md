# Interface: Frontend UI

The ChronoSchool Frontend is a single-page application (SPA) providing a visual interface for school administrators to manage resources and view/edit timetables.

## Tech Stack
- **Framework:** React or Vue (as per PRD)
- **State Management:** TanStack Query (React Query) for API synchronization.
- **Styling:** Tailwind CSS / UI Component Library.

## Main Views

### 1. Dashboard
Overview of the school's scheduling status, active jobs, and recent timetables.

### 2. Resource Management
- **Teacher Directory:** Add/Edit teachers and their subject proficiencies.
- **Subject List:** Define subjects and requirements (e.g., double periods).
- **Class/Stream Setup:** Configure grades and weekly curriculums.

### 3. Solver Workspace
- Configuration of global settings (timeslots, days, breaks).
- Triggering the Solver and monitoring progress in real-time.

### 4. Timetable Viewer
- Color-coded grid view.
- Filters: By Class, By Teacher, By Room.
- **Manual Adjustments:** Drag-and-drop interface for swapping periods with real-time constraint validation.

## API Integration
The frontend consumes the **Backend API & Gateway** (Component 2) via REST and SSE/WebSockets.

### Required Environment Variables
- `VITE_API_BASE_URL`: The URL of the backend API.
- `VITE_AUTH_DOMAIN`: Identity provider domain (if using external auth).
