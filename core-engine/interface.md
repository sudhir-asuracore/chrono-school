# Interface: Core Optimization Engine

The Core Optimization Engine is a stateless Python service that uses Google OR-Tools to solve school timetable constraints.

## Communication Protocol
- **Input:** JSON payload via POST request or CLI stdin.
- **Output:** JSON payload via HTTP response or CLI stdout.

## Endpoints

### `POST /solve`
Solves the timetable optimization problem based on provided settings and constraints.

#### Request Body
```json
{
  "settings": {
    "timeslots_per_day": "integer",
    "days": ["string"],
    "max_search_seconds": "integer"
  },
  "fixed_breaks": [
    { "day": "string", "slot_index": "integer", "label": "string" }
  ],
  "teachers": [
    { "id": "string", "name": "string", "max_slots_per_week": "integer", "qualified_subjects": ["string"] }
  ],
  "subjects": [
    { "id": "string", "name": "string", "requires_double_period": "boolean" }
  ],
  "classes": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "curriculum": [
        { "subject_id": "string", "periods_per_week": "integer" }
      ]
    }
  ]
}
```

#### Response Body
```json
{
  "status": "OPTIMAL | FEASIBLE | INFEASIBLE | MODEL_INVALID | UNKNOWN",
  "solve_time_ms": "integer",
  "schedule": [
    {
      "day": "string",
      "slot_index": "integer",
      "class_id": "string",
      "subject_id": "string",
      "teacher_id": "string"
    }
  ],
  "unassigned_lessons": [
    { "class_id": "string", "subject_id": "string", "count": "integer" }
  ]
}
```

## Constraints Handled

### Hard Constraints
- `NoTeacherDoubleBooking`: Teachers cannot be in two places at once.
- `NoRoomDoubleBooking`: Rooms cannot hold two classes at once.
- `ClassMaxOneLesson`: Classes can only have one subject at a time.
- `DoublePeriods`: Consecutive slots for subjects requiring it.
- `FixedBreaks`: No lessons during breaks.

### Soft Constraints
- `SubjectBalancing`: Spreading subjects evenly across the week.
- `TeacherWindowOptimization`: Minimizing gaps in teacher schedules.
