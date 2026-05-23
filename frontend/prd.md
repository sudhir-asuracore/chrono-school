# PRD: Frontend UI

## 1. Overview
The Frontend UI is a modern web application for school administrators to interactively manage school data and visualize/edit generated timetables.

## 2. Technical Stack
- **Framework:** React
- **Language:** TypeScript
- **State Management:** TanStack Query (React Query)
- **Styling:** Tailwind CSS
- **Visualization:** Dnd-kit (for drag and drop), Headless UI

## 3. Functional Requirements
- **Resource Dashboards:**
    - Interactive forms for Teachers, Subjects, and Classes.
    - Validation of input data (e.g., preventing zero-hour requirements).
- **Solver Interface:**
    - Configuration of global settings (days, slots, breaks).
    - Real-time progress monitoring of solver jobs.
- **Timetable Grid:**
    - Visual representation of the schedule (By Class, By Teacher).
    - Color-coding for subject types.
- **Manual Overrides:**
    - Drag-and-drop to swap lessons.
    - Immediate visual feedback on constraint violations (e.g., highlighting a slot red if a teacher is double-booked).

## 4. User Experience (UX)
- Responsive design for tablets and desktops.
- Fast, optimistic UI updates for manual adjustments.
- Clear error messaging and diagnostic reporting for failed solver jobs.

## 5. Verification Criteria
- All CRUD screens must correctly sync with the Backend API.
- The timetable grid must render correctly for different filters.
- Drag-and-drop must trigger validation and update the state (or show errors).
