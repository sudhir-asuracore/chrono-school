# Interface: Async Job Queue

The Async Job Queue handles the background execution of timetable generation tasks, decoupling the API from the heavy lifting of the Solver Engine.

## Component Role
- **Broker:** Redis or PostgreSQL.
- **Workers:** Go-based consumers that fetch jobs, prepare the Solver Engine input, and update job status.

## Internal Interface (Job Payload)

When a job is pushed to the queue, it should contain:
```json
{
  "job_id": "string",
  "organization_id": "string",
  "payload": {
    "settings": { ... },
    "teachers": [ ... ],
    "subjects": [ ... ],
    "classes": [ ... ]
  }
}
```

## Worker Responsibilities
1. **Fetch Job:** Pull a pending job from the queue.
2. **Execute Solver:** Call the Core Optimization Engine (Component 1).
3. **State Management:** Update the PostgreSQL `timetable_jobs` table with the result or error.
4. **Monitoring:** Report progress and handle timeouts.

## Configuration
- `MAX_CONCURRENT_SOLVERS`: Limits the number of simultaneous solver executions.
- `SOLVER_TIMEOUT`: Maximum time allowed for the solver to run.
