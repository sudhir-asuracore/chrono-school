# PRD: Core Optimization Engine

## 1. Overview
The Core Optimization Engine is a stateless Python microservice responsible for solving the combinatorial problem of school timetable generation. It leverages Google OR-Tools (CP-SAT Solver) to find optimal or feasible solutions based on a set of hard and soft constraints.

## 2. Technical Stack
- **Language:** Python 3.x
- **Optimization Library:** Google OR-Tools (CP-SAT)
- **API Framework:** Flask (or FastAPI)
- **Data Validation:** Pydantic

## 3. Functional Requirements
- **Constraint Modeling:**
    - Translate JSON input into a mathematical model.
    - Implement hard constraints: No teacher/room double bookings, max one lesson per class, double period requirements, and fixed breaks.
    - Implement soft constraints: Subject balancing (even spread) and teacher window optimization (minimizing gaps).
- **Execution:**
    - Accept `max_search_seconds` to bound execution time.
    - Return `OPTIMAL`, `FEASIBLE`, or `INFEASIBLE` status.
- **Statelessness:** No local storage; every request must contain all necessary data.

## 4. Input/Output Specification
- **Input:** Comprehensive JSON containing settings, fixed breaks, teachers, subjects, and classes with their curriculums.
- **Output:** JSON containing the solve status, execution time, and a list of scheduled assignments (day, slot, class, subject, teacher).

## 5. Performance Targets
- Handle up to 1000 lessons across 50 teachers and 30 classes within 60 seconds.
- Memory usage should be predictable based on the problem size.

## 6. Verification Criteria
- Integration tests with known "impossible" configurations to verify `INFEASIBLE` detection.
- Performance benchmarks for typical school sizes.
