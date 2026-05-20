# Product Requirement Document (PRD)

## Project: ChronoSchool (Open-Source Automated School Timetable Generator)

**License:** AGPLv3

**Target Architecture:** Decoupled Microservices / Modular Monolith (Go Core + Python Solver Engine + Vue/React Frontend)

---

## 1. System Architecture Overview

To support self-hosted single instances, the system is divided into four highly isolated components. Communication between components relies on strict JSON contracts, allowing an AI agent or developer to build, test, and mock each module independently.

```
┌────────────────────────────────────────────────────────┐
│               Component 3: Frontend UI                 │
│                   (React or Vue)                       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WebSockets
                           ▼
┌────────────────────────────────────────────────────────┐
│           Component 2: Backend API & Gateway           │
│                        (Go)                            │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼ (Job Push/Poll)           ▼ (SQL)
┌──────────────────────────────┐ ┌───────────────────────┐
│ Component 4: Async Job Queue │ │ Component 5: Database │
│       (Redis / PostgreSQL)   │ │     (PostgreSQL)      │
└──────────────┬───────────────┘ └───────────────────────┘
               │
               ▼ (Fetch Job)
┌────────────────────────────────────────────────────────┐
│         Component 1: Core Optimization Engine          │
│               (Python + Google OR-Tools)               │
└────────────────────────────────────────────────────────┘
```

---

## Component 1: Core Optimization Engine (Python + OR-Tools)

### Scope

A stateless, high-performance CLI/Microservice wrapper around **Google OR-Tools (CP-SAT Solver)**. It accepts a raw school configuration payload, transforms it into an optimization matrix, solves the mathematical constraints, and returns a deterministic timetable grid.

### Functional Requirements

- **Constraint Modeling:** Translate hard and soft business rules into standard mathematical constraints using the CP-SAT solver framework.
    
- **Execution Isolation:** Must run statelessly. It takes input JSON, processes it using multi-threaded CPU allocations, and emits output JSON.
    
- **Timeout Guardrails:** Accept a maximum calculation duration parameter (e.g., abort and return best-effort solution after 60 seconds).
    

### Constraint Specifications

- **Hard Constraints (Non-Negotiable):**
    
    - `NoTeacherDoubleBooking`: A teacher cannot be assigned to multiple streams/classes in the same timeslot.
        
    - `NoRoomDoubleBooking`: A room/class location cannot hold two classes simultaneously.
        
    - `ClassMaxOneLesson`: A specific class/stream cannot have more than one active subject block per slot.
        
    - `DoublePeriods`: Specific subjects flagged as requiring "double periods" must be allocated into two consecutive timeslots on the same day without being split by breaks.
        
    - `FixedBreaks`: No lessons can be scheduled during global structural time blocks (e.g., Recess, Lunch).
        
- **Soft Constraints (Optimization Targets / Penalties):**
    
    - `SubjectBalancing`: Minimize instances where the same subject appears multiple times in a single day for a stream (spread math evenly across the week).
        
    - `TeacherWindowOptimization`: Minimize empty "gap" periods within a teacher’s daily schedule.
        

### Interface Specification (JSON Input/Output)

#### Input Payload (`POST /solve` or CLI stdin)

JSON

```
{
  "settings": { "timeslots_per_day": 8, "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "max_search_seconds": 60 },
  "fixed_breaks": [ { "day": "All", "slot_index": 4, "label": "Lunch Break" } ],
  "teachers": [
    { "id": "t_01", "name": "Mr. John Doe", "max_slots_per_week": 24, "qualified_subjects": ["sub_math", "sub_physics"] }
  ],
  "subjects": [
    { "id": "sub_math", "name": "Mathematics", "requires_double_period": true },
    { "id": "sub_history", "name": "History", "requires_double_period": false }
  ],
  "classes": [
    {
      "id": "class_9a",
      "name": "Grade 9, Stream A",
      "type": "secondary",
      "curriculum": [
        { "subject_id": "sub_math", "periods_per_week": 5 },
        { "subject_id": "sub_history", "periods_per_week": 3 }
      ]
    }
  ]
}
```

#### Output Payload

JSON

```
{
  "status": "OPTIMAL",
  "solve_time_ms": 1420,
  "schedule": [
    {
      "day": "Mon",
      "slot_index": 0,
      "class_id": "class_9a",
      "subject_id": "sub_math",
      "teacher_id": "t_01"
    }
  ],
  "unassigned_lessons": []
}
```

---

## Component 2: Backend API & Gateway (Go)

### Scope

The central conductor orchestrating authentication, CRUD operations for tenant metadata (teachers, subjects, rooms), and scheduling lifecycle management. Built natively in **Go** for blistering concurrency handling and low resource consumption on minimal host setups.

### Functional Requirements

- **RESTful Configuration API:** Standard CRUD endpoints for school resources (`/api/v1/teachers`, `/api/v1/subjects`, `/api/v1/classes`).
    
- **Job Ingestion Engine:** Accepts execution triggers, saves the snapshot payload to PostgreSQL, pushes a job reference to the task queue, and serves a unique execution tracking ID back to the client.
    
- **Solver Abstraction:** Expose transactional status updates via polling endpoints or Server-Sent Events (SSE) / WebSockets to inform the frontend of calculation states (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
    

### Database Schema Draft (PostgreSQL)

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   organizations  │──────►│     teachers     │──────►│  teacher_subjs  │
│ (Multi-tenant ID)│       │ (Name, MaxSlots) │       │ (Many-to-Many)   │
└──────────────────┘       └──────────────────┘       └──────────────────┘
         │                          ▲
         ▼                          │
┌──────────────────┐       ┌────────┴─────────┐
│     classes      │──────►│  timetable_jobs  │
│ (Name, Stream)   │       │ (Status, Payload)│
└──────────────────┘       └──────────────────┘
```

---

## Component 3: Async Job Queue & Worker State Management

### Scope

An asynchronous message processing architecture designed to shield the web tier from memory/CPU spikes during massive combinatorial calculations.

### Functional Requirements

- **Job Queue Broker:** Utilize either a Redis back-end (via tasks systems like `hibiken/asynq` in Go) or a reliable PostgreSQL polling state engine (`riverqueue`).
    
- **Concurrency Limiting:** Allow site administrators to explicitly declare max concurrent execution slots (e.g., `MAX_CONCURRENT_SOLVERS=4`) to preserve host stability.
    
- **State Scribes:** Workers are strictly responsible for catching system crashes or execution timeouts from Component 1 and gracefully updating the PostgreSQL `timetable_jobs` schema row with diagnostic trace reports.
    

---

## Component 4: Frontend UI App (Vue or React Framework)

### Scope

A modern, visual administrative single-page application. Rather than dealing with raw database configuration structures, users interact with a highly polished visual scheduler design workspace.

### Functional Requirements

- **Resource Matrices:** Tabular, reactive forms for setting up constraints, listing teachers, checking off subject proficiencies, and declaring target hours per week.
    
- **Interactive Timetable View:** A color-coded calendar grid. Must support dynamic filtering views:
    
    - _Filter by Class:_ Display the schedule layout for a specific grade/stream.
        
    - _Filter by Teacher:_ Display a unified layout mapping the individual teacher's weekly movements across different classes.
        
- **Visual Manual Adjustment System:** Even after optimization, admins occasionally demand granular edits. The UI must support drag-and-drop cell swaps. When manual modification happens, client-side validation logic flags any resulting hard constraints conflicts instantly (e.g., highlighting a slot in bright red if a manual change double-books a teacher).
    

---

## Development Milestones & Verification Criteria

To ensure your agentic AI workflow operates with hyper-focused tasks, use the following execution ordering checklist:

|**Phase**|**Focus Target**|**Verification Metric**|
|---|---|---|
|**Phase 1**|**Component 1 (Python Solver Engine)**|Execute localized integration test pass: Feed JSON payload with an obvious double-booking requirement. Confirm the engine returns `INFEASIBLE` or solves around it correctly.|
|**Phase 2**|**Component 2 (Go API & DB Foundations)**|Generate DB migrations. Spin up system and verify structural integrity via basic CRUD endpoint integration tests.|
|**Phase 3**|**Component 3 (Job Queue integration)**|Simulate multiple concurrent computation bursts. Verify API nodes accept requests immediately and task processing pipelines drain sequentially without exhausting server memory.|
|**Phase 4**|**Component 4 (Frontend Implementation)**|Build data grid visualization layouts. Verify validation engine handles manual changes smoothly and renders overlapping asset clashes in real-time.|
